import { createTestingPinia } from "@pinia/testing";
import { mount, shallowMount, type Wrapper } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { PiniaVuePlugin, setActivePinia } from "pinia";
import { getLocalVue } from "tests/jest/helpers";

import invocationData from "../Workflow/test/json/invocation.json";

import WorkflowInvocationState from "./WorkflowInvocationState.vue";

const localVue = getLocalVue();
localVue.use(PiniaVuePlugin);

const selectors = {
    invocationSummary: ".invocation-overview",
};

/** Invocation data to be expected in the store */
const invocationById = {
    [invocationData.id]: invocationData,
    "not-fetched-invocation": null,
    "non-terminal-id": {
        ...invocationData,
        id: "non-terminal-id",
        state: "new",
    },
    "non-terminal-jobs": {
        ...invocationData,
        id: "non-terminal-jobs",
    },
};

// Jobs summary constants
const invocationDataJobsSummary = {
    model: "WorkflowInvocation",
    states: {},
    populated_state: "ok",
};
const invocationJobsSummaryById = {
    [invocationData.id]: invocationDataJobsSummary,
    "not-fetched-invocation": null,
    "non-terminal-id": invocationDataJobsSummary,
    "non-terminal-jobs": {
        ...invocationDataJobsSummary,
        states: {
            running: 1,
        },
    },
};

// Mock the invocation store to return the expected invocation data given the invocation ID
jest.mock("@/stores/invocationStore", () => {
    const originalModule = jest.requireActual("@/stores/invocationStore");
    const mockFetchInvocationForId = jest.fn().mockImplementation((fetchParams) => {
        if (fetchParams.id === "error-invocation") {
            throw new Error("User does not own specified item.");
        }
    });
    const mockFetchInvocationJobsSummaryForId = jest.fn();
    return {
        ...originalModule,
        useInvocationStore: () => ({
            ...originalModule.useInvocationStore(),
            getInvocationById: jest.fn().mockImplementation((invocationId) => {
                return invocationById[invocationId];
            }),
            getInvocationJobsSummaryById: jest.fn().mockImplementation((invocationId) => {
                return invocationJobsSummaryById[invocationId];
            }),
            fetchInvocationForId: mockFetchInvocationForId,
            fetchInvocationJobsSummaryForId: mockFetchInvocationJobsSummaryForId,
        }),
        mockFetchInvocationForId,
        mockFetchInvocationJobsSummaryForId,
    };
});

/** Mount the WorkflowInvocationState component with the given invocation ID
 * @param invocationId The invocation ID to be passed as a prop
 * @returns The mounted wrapper
 */
async function mountWorkflowInvocationState(invocationId: string, shallow = true) {
    const pinia = createTestingPinia();
    setActivePinia(pinia);

    let wrapper;
    if (shallow) {
        wrapper = shallowMount(WorkflowInvocationState as object, {
            propsData: {
                invocationId,
            },
            pinia,
            localVue,
        });
    } else {
        wrapper = mount(WorkflowInvocationState as object, {
            propsData: {
                invocationId,
            },
            pinia,
            localVue,
        });
    }
    await flushPromises();
    return wrapper;
}

describe("WorkflowInvocationState check invocation and job terminal states", () => {
    it("determines that invocation and job states are terminal with terminal invocation", async () => {
        const wrapper = await mountWorkflowInvocationState(invocationData.id);
        expect(isInvocationAndJobTerminal(wrapper)).toBe(true);

        // Invocation is fetched once and the jobs summary isn't fetched at all for terminal invocations
        assertInvocationFetched(1);
        assertJobsSummaryFetched(0);
    });

    it("determines that invocation and job states are not terminal with no fetched invocation", async () => {
        const wrapper = await mountWorkflowInvocationState("not-fetched-invocation");
        expect(isInvocationAndJobTerminal(wrapper)).toBe(false);

        // Invocation is fetched once and the jobs summary is then never fetched if the invocation is not in the store
        assertInvocationFetched(1);
        assertJobsSummaryFetched(0);

        // expect there to be an alert for the missing invocation
        const alert = wrapper.find("balert-stub");
        expect(alert.attributes("variant")).toBe("info");
        const span = alert.find("span");
        expect(span.text()).toBe("Invocation not found.");
    });

    it("determines that invocation is not terminal with non-terminal state", async () => {
        const wrapper = await mountWorkflowInvocationState("non-terminal-id");
        expect(isInvocationAndJobTerminal(wrapper)).toBe(false);

        // Only the invocation is fetched for non-terminal invocations; once for the initial fetch and then for the polling
        assertInvocationFetched(2);
        assertJobsSummaryFetched(0);
    });

    it("determines that job states are not terminal with non-terminal jobs but scheduled invocation", async () => {
        const wrapper = await mountWorkflowInvocationState("non-terminal-jobs");
        expect(isInvocationAndJobTerminal(wrapper)).toBe(false);

        // Only the jobs summary should be polled, the invocation is initially fetched only since it is in scheduled/terminal state
        assertInvocationFetched(1);
        assertJobsSummaryFetched(1);
    });

    it("determines that errored invocation fetches are handled correctly", async () => {
        const wrapper = await mountWorkflowInvocationState("error-invocation");
        expect(isInvocationAndJobTerminal(wrapper)).toBe(false);

        // Invocation is fetched once and the jobs summary isn't fetched at all for errored invocations
        assertInvocationFetched(1);
        assertJobsSummaryFetched(0);

        // expect there to be an alert for the handled error
        const alert = wrapper.find("balert-stub");
        expect(alert.attributes("variant")).toBe("danger");
        expect(alert.text()).toBe("User does not own specified item.");
    });
});

describe("WorkflowInvocationState check 'Report' tab disabled state", () => {
    it("determines that 'Report' tab is disabled for non-terminal invocation", async () => {
        const wrapper = await mountWorkflowInvocationState("non-terminal-id", false);
        const reportTab = wrapper.find(".invocation-report-tab").find(".nav-link");
        expect(reportTab.classes()).toContain("disabled");
    });
    it("determines that 'Report' tab is not disabled for terminal invocation", async () => {
        const wrapper = await mountWorkflowInvocationState(invocationData.id, false);
        const reportTab = wrapper.find(".invocation-report-tab").find(".nav-link");
        expect(reportTab.classes()).not.toContain("disabled");
    });
});

/**
 * This is a somewhat hacky way to determine if the invocation and job states are terminal without
 * exposing the internals of the component. This is just to restore the previous behavior of the test
 * and it only uses the wrapper to check the props of the invocation summary component.
 */
function isInvocationAndJobTerminal(wrapper: Wrapper<Vue>): boolean {
    const invocationSummary = wrapper.find(selectors.invocationSummary);
    return invocationSummary.exists() && invocationSummary.html().includes('invocationandjobterminal="true"');
}

/** Asserts that the invocation was fetched in the store the given number of times */
function assertInvocationFetched(count = 1) {
    const { mockFetchInvocationForId } = jest.requireMock("@/stores/invocationStore");
    expect(mockFetchInvocationForId).toHaveBeenCalledTimes(count);
}

/** Asserts that the jobs summary was fetched in the store the given number of times */
function assertJobsSummaryFetched(count = 1) {
    const { mockFetchInvocationJobsSummaryForId } = jest.requireMock("@/stores/invocationStore");
    expect(mockFetchInvocationJobsSummaryForId).toHaveBeenCalledTimes(count);
}
