import $ from "jquery";
import _ from "underscore";
import Terminals from "mvc/workflow/workflow-terminals";
import Connector from "mvc/workflow/workflow-connector";
import ariaAlert from "utils/ariaAlert";

class TerminalMappingView {
    constructor(options = {}) {
        this.$el = $("<div class='fa-icon-button fa fa-folder-o' />");
        var mapText = "Run tool in parallel over collection";
        this.$el.tooltip({ delay: 500, title: mapText });
        this.model = options.model;
        this.model.bind("change", _.bind(this.render, this));
    }
    render() {
        if (this.model.mapOver && this.model.mapOver.isCollection) {
            this.$el.show();
        } else {
            this.$el.hide();
        }
    }
}

export class InputTerminalMappingView extends TerminalMappingView {
    constructor(options = {}) {
        super(options);
        const self = this;
        this.$el.on("click", () => self.onClick());
        this.$el.on("mouseenter", () => self.onMouseEnter());
        this.$el.on("mouseleave", () => self.onMouseLeave());
    }
    onMouseEnter() {
        var model = this.model;
        if (!model.terminal.connected() && model.mapOver.isCollection) {
            this.$el.css("color", "red");
        }
    }
    onMouseLeave() {
        this.$el.css("color", "black");
    }
    onClick() {
        var model = this.model;
        if (!model.terminal.connected() && model.mapOver.isCollection) {
            // TODO: Consider prompting...
            model.terminal.resetMapping();
        }
    }
}

class TerminalView {
    setupMappingView(terminal) {
        console.log(this.terminalMappingClass);
        var terminalMapping = new this.terminalMappingClass({
            terminal: terminal
        });
        var terminalMappingView = new this.terminalMappingViewClass({
            model: terminalMapping
        });
        terminalMappingView.render();
        terminal.terminalMappingView = terminalMappingView;
        this.terminalMappingView = terminalMappingView;
    }
    terminalElements() {
        if (this.terminalMappingView) {
            return [this.terminalMappingView.el, this.el];
        } else {
            return [this.el];
        }
    }
}

class BaseInputTerminalView extends TerminalView {
    constructor(options = {}, classes = {}) {
        super();
        this.terminalMappingViewClass = classes.terminalMappingViewClass;
        this.terminalMappingClass = classes.terminalMappingClass;
        this.el = document.createElement("div");
        this.el.className = "terminal input-terminal";
        this.$el = $(this.el);
        const node = options.node;
        const input = options.input;
        const name = input.name;
        const id = `node-${node.cid}-input-${name}`;
        const terminal = this.terminalForInput(input);
        this.setupMappingView(terminal);
        this.el.terminal = terminal;
        this.$el.attr("input-name", name);
        this.$el.attr("id", id);
        this.$el.append($("<icon/>"));
        this.id = id;

        terminal.node = node;
        terminal.name = name;
        terminal.label = input.label;
        node.input_terminals[name] = terminal;

        const self = this;
        this.$el.on("dropinit", (e, d) => self.onDropInit(e, d));
        this.$el.on("dropstart", (e, d) => self.onDropStart(e, d));
        this.$el.on("dropend", (e, d) => self.onDropEnd(e, d));
        this.$el.on("drop", (e, d) => self.onDrop(e, d));
        this.$el.on("hover", () => self.onHover());
    }
    onDropInit(e, d = {}) {
        var terminal = this.el.terminal;
        // Accept a dragable if it is an output terminal and has a
        // compatible type
        var connectionAcceptable = $(d.drag).hasClass("output-terminal") && terminal.canAccept(d.drag.terminal);
        if (connectionAcceptable.canAccept) {
            this.$el.addClass("can-accept");
            this.$el.removeClass("cannot-accept");
            this.reason = null;
        } else {
            this.$el.addClass("cannot-accept");
            this.$el.removeClass("can-accept");
            this.reason = connectionAcceptable.reason;
        }

        return true;
    }
    onDropStart(e, d = {}) {
        if (d.proxy.terminal) {
            if (this.$el.hasClass("can-accept")) {
                d.proxy.terminal.connectors[0].inner_color = "#BBFFBB";
                d.proxy.dropTooltip = "";
            } else {
                d.proxy.terminal.connectors[0].inner_color = "#fe7f02";
                if (this.reason) {
                    d.proxy.dropTooltip = this.reason;
                    $(d.proxy).tooltip("show");
                } else {
                    d.proxy.dropTooltip = "";
                }
            }
        }
    }
    onDropEnd(e, d = {}) {
        d.proxy.dropTooltip = "";
        if (d.proxy.terminal) {
            d.proxy.terminal.connectors[0].inner_color = "#FFFFFF";
        }
    }
    onDrop(e, d = {}) {
        d.proxy.dropTooltip = "";
        if (this.$el.hasClass("can-accept")) {
            const terminal = this.el.terminal;
            new Connector(d.drag.terminal, terminal).redraw();
        }
    }
    onHover() {
        const element = this.el;
        const terminal = element.terminal;
        // If connected, create a popup to allow disconnection
        if (terminal.connectors.length > 0) {
            const t = $("<div/>")
                .addClass("delete-terminal")
                .click(() => {
                    $.each(terminal.connectors, (_, x) => {
                        if (x) {
                            x.destroy();
                        }
                    });
                    t.remove();
                })
                .on("mouseleave", () => {
                    t.remove();
                });
            $(element)
                .parent()
                .append(t);
        }
    }
}

export class InputTerminalView extends BaseInputTerminalView {
    constructor(options = {}) {
        super(options, {
            terminalMappingViewClass: InputTerminalMappingView,
            terminalMappingClass: Terminals.TerminalMapping
        });
    }
    terminalForInput(input) {
        return new Terminals.InputTerminal({
            element: this.el,
            input: input
        });
    }
}

export class InputParameterTerminalView extends BaseInputTerminalView {
    constructor(options = {}) {
        super(options, {
            terminalMappingViewClass: InputTerminalMappingView,
            terminalMappingClass: Terminals.TerminalMapping
        });
    }
    terminalForInput(input) {
        return new Terminals.InputParameterTerminal({
            element: this.el,
            input: input
        });
    }
}

export class InputCollectionTerminalView extends BaseInputTerminalView {
    constructor(options = {}) {
        super(options, {
            terminalMappingViewClass: InputTerminalMappingView,
            terminalMappingClass: Terminals.TerminalMapping
        });
    }
    terminalForInput(input = {}) {
        return new Terminals.InputCollectionTerminal({
            element: this.el,
            input: input
        });
    }
}

export class BaseOutputTerminalView extends TerminalView {
    constructor(app, options, classes = {}) {
        super();
        this.app = app;
        this.terminalMappingViewClass = classes.terminalMappingViewClass;
        this.terminalMappingClass = classes.terminalMappingClass;
        this.el = document.createElement("div");
        this.el.className = "terminal output-terminal";
        this.$el = $(this.el);
        const node = options.node;
        const output = options.output;
        const name = output.name;
        const id = `node-${node.cid}-output-${name}`;
        const terminal = this.terminalForOutput(output);
        this.setupMappingView(terminal);
        this.el.terminal = terminal;
        this.$el.attr(
            "aria-label",
            `connect output ${name} from ${node.name} to input. Press space to see a list of available inputs`
        );
        this.$el.attr("output-name", name);
        this.$el.attr("id", id);
        this.$el.attr("tabindex", "0");
        this.$el.attr("aria-grabbed", "false");
        this.$el.append($("<icon/>"));
        terminal.node = node;
        terminal.name = name;
        terminal.label = output.label;
        node.output_terminals[name] = terminal;

        const self = this;
        this.$el.on("drag", (d, e) => self.onDrag(d, e));
        this.$el.on("dragstart", (d, e) => self.onDragStart(d, e));
        this.$el.on("dragend", (d, e) => self.onDragEnd(d, e));
        this.$el.on("keydown", e => self.screenReaderSelectOutputNode(e));
    }
    screenReaderSelectOutputNode(e) {
        const inputChoiceKeyDown = e => {
            e.stopPropagation();
            const currentItem = e.currentTarget;
            const previousItem = currentItem.previousSibling;
            const nextItem = currentItem.nextSibling;
            const inputTerminal = currentItem.input.context.terminal;
            const switchActiveItem = (currentActive, newActive) => {
                newActive.classList.add("active");
                newActive.focus();
                currentActive.classList.remove("active");
            };
            const removeMenu = () => {
                $(currentItem.parentNode).remove();
                this.$el.removeAttr("aria-owns");
                this.$el.attr("aria-grabbed", "false");
                this.$el.focus();
            };
            switch (e.keyCode) {
                case 40: // Down arrow
                    if (nextItem) {
                        switchActiveItem(currentItem, nextItem);
                    } else {
                        switchActiveItem(currentItem, currentItem.parentNode.firstChild);
                    }
                    break;
                case 38: // Up arrow
                    if (previousItem) {
                        switchActiveItem(currentItem, previousItem);
                    } else {
                        switchActiveItem(currentItem, currentItem.parentNode.lastChild);
                    }
                    break;
                case 32: // Space
                    removeMenu();
                    new Connector(this.el.terminal, inputTerminal).redraw();
                    ariaAlert("Node connected");

                    if (inputTerminal.connectors.length > 0) {
                        const t = $("<div/>")
                            .addClass("delete-terminal")
                            .attr("tabindex", "0")
                            .attr("aria-label", "delete terminal")
                            .on("keydown click", e => {
                                if (e.keyCode === 32 || e.type === "click") {
                                    //Space or Click
                                    $.each(inputTerminal.connectors, (_, x) => {
                                        if (x) {
                                            x.destroy();
                                            ariaAlert("Connection destroyed");
                                        }
                                    });
                                    t.remove();
                                }
                            });
                        $(currentItem.input)
                            .parent()
                            .append(t);
                    }
                    break;
            }
        };
        const buildInputChoicesMenu = () => {
            const inputChoicesMenu = document.createElement("ul");
            $(inputChoicesMenu).focusout(e => {
                /* focus is still inside child element of menu so don't hide */
                if (inputChoicesMenu.contains(e.relatedTarget)) {
                    return;
                }
                $(inputChoicesMenu).hide();
            });
            inputChoicesMenu.id = "input-choices-menu";
            inputChoicesMenu.className = "list-group";
            inputChoicesMenu.setAttribute("role", "menu");
            this.$el.attr("aria-grabbed", "true");
            this.$el.attr("aria-owns", "input-choices-menu");

            $(".input-terminal").each((i, el) => {
                const input = $(el);
                const inputTerminal = input.context.terminal;
                const connectionAcceptable = inputTerminal.canAccept(this.el.terminal);
                if (connectionAcceptable.canAccept) {
                    const inputChoiceItem = document.createElement("li");
                    inputChoiceItem.textContent = `${inputTerminal.name} in ${inputTerminal.node.name} node`;
                    inputChoiceItem.tabIndex = -1;
                    inputChoiceItem.input = input;
                    inputChoiceItem.onkeydown = inputChoiceKeyDown;
                    inputChoiceItem.className = "list-group-item";
                    inputChoiceItem.setAttribute("role", "menuitem");
                    inputChoicesMenu.appendChild(inputChoiceItem);
                }
            });
            if (inputChoicesMenu.firstChild) {
                this.$el.append(inputChoicesMenu);
                inputChoicesMenu.firstChild.classList.add("active");
                inputChoicesMenu.firstChild.focus();
            } else {
                ariaAlert("There are no available inputs for this selected output");
            }
        };

        if (e.keyCode === 32) {
            //Space
            ariaAlert("Node selected");
            buildInputChoicesMenu();
        }
    }
    onDrag(e, d = {}) {
        var onmove = () => {
            var canvasZoom = this.app.canvas_manager.canvasZoom;
            var po = $(d.proxy)
                .offsetParent()
                .offset();

            var x = d.offsetX - po.left;
            var y = d.offsetY - po.top;
            $(d.proxy).css({ left: x / canvasZoom, top: y / canvasZoom });
            d.proxy.terminal.redraw();
            this.app.canvas_manager.update_viewport_overlay();
        };
        onmove();
        $("#canvas-container")
            .get(0)
            .scroll_panel.test(e, onmove);
    }
    onDragStart(e, d = {}) {
        $(d.available).addClass("input-terminal-active");
        // Save PJAs in the case of change datatype actions.
        this.app.check_changes_in_active_form();
        // Drag proxy div
        var h = $("<div class='drag-terminal'/>")
            .appendTo("#canvas-container")
            .get(0);

        h.dropTooltip = "";

        // Terminal and connection to display noodle while dragging
        $(h).tooltip({
            title: function() {
                return h.dropTooltip || "";
            }
        });
        h.terminal = new Terminals.OutputTerminal({ element: h });
        var c = new Connector();
        c.dragging = true;
        c.connect(this.el.terminal, h.terminal);
        return h;
    }
    onDragEnd(e, d = {}) {
        var connector = d.proxy.terminal.connectors[0];
        // check_changes_in_active_form may change the state and cause a
        // the connection to have already been destroyed. There must be better
        // ways to handle this but the following check fixes some serious GUI
        // bugs for now.
        if (connector) {
            connector.destroy();
        }
        $(d.proxy).tooltip("dispose");
        $(d.proxy).remove();
        $(d.available).removeClass("input-terminal-active");
        $("#canvas-container")
            .get(0)
            .scroll_panel.stop();
    }
}

export class OutputTerminalView extends BaseOutputTerminalView {
    constructor(app, options = {}) {
        super(app, options, {
            terminalMappingViewClass: TerminalMappingView,
            terminalMappingClass: Terminals.TerminalMapping
        });
    }
    terminalForOutput(output) {
        var type = output.extensions;
        return new Terminals.OutputTerminal({
            element: this.el,
            datatypes: type,
            force_datatype: output.force_datatype,
            optional: output.optional
        });
    }
}

export class OutputCollectionTerminalView extends BaseOutputTerminalView {
    constructor(app, options = {}) {
        super(app, options, {
            terminalMappingViewClass: TerminalMappingView,
            terminalMappingClass: Terminals.TerminalMapping
        });
    }
    terminalForOutput(output) {
        var collection_type = output.collection_type;
        var collection_type_source = output.collection_type_source;
        return new Terminals.OutputCollectionTerminal({
            element: this.el,
            collection_type: collection_type,
            collection_type_source: collection_type_source,
            datatypes: output.extensions,
            force_datatype: output.force_datatype,
            optional: output.optional
        });
    }
}

export class OutputParameterTerminalView extends BaseOutputTerminalView {
    constructor(app, options = {}) {
        super(app, options, {
            terminalMappingViewClass: TerminalMappingView,
            terminalMappingClass: Terminals.TerminalMapping
        });
    }
    terminalForOutput(output) {
        return new Terminals.OutputParameterTerminal({
            element: this.el,
            type: output.type,
            optional: output.optional
        });
    }
}

export default {
    InputTerminalView: InputTerminalView,
    InputParameterTerminalView: InputParameterTerminalView,
    InputCollectionTerminalView: InputCollectionTerminalView,
    OutputTerminalView: OutputTerminalView,
    OutputParameterTerminalView: OutputParameterTerminalView,
    OutputCollectionTerminalView: OutputCollectionTerminalView
};
