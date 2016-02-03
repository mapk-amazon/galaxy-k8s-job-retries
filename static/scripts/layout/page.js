define(["layout/masthead","layout/panel","mvc/ui/ui-modal","mvc/base-mvc"],function(a,b,c,d){var e=Backbone.View.extend(d.LoggableMixin).extend({_logNamespace:"layout",el:"body",className:"full-content",_panelIds:["left","center","right"],defaultOptions:{message_box_visible:!1,message_box_content:"",message_box_class:"info",show_inactivity_warning:!1,inactivity_box_content:""},initialize:function(b){this.log(this+".initialize:",b),_.extend(this,_.pick(b,this._panelIds)),this.options=_.defaults(_.omit(b,this._panelIds),this.defaultOptions),Galaxy.modal=this.modal=new c.View,this.masthead=new a.View(this.options.config),this.$el.attr("scroll","no"),this.$el.append(this._template()),this.$el.append(this.masthead.$el),this.$el.append(this.modal.$el),this.$messagebox=this.$("#messagebox"),this.$inactivebox=this.$("#inactivebox")},render:function(){return $(".select2-hidden-accessible").remove(),this.log(this+".render:"),this.masthead.render(),this.renderMessageBox(),this.renderInactivityBox(),this.renderPanels(),this},renderMessageBox:function(){if(this.options.message_box_visible){var a=this.options.message_box_content||"",b=this.options.message_box_class||"info";this.$el.addClass("has-message-box"),this.$messagebox.attr("class","panel-"+b+"-message").html(a).toggle(!!a).show()}else this.$el.removeClass("has-message-box"),this.$messagebox.hide();return this},renderInactivityBox:function(){if(this.options.show_inactivity_warning){var a=this.options.inactivity_box_content||"",b=$("<a/>").attr("href",Galaxy.root+"user/resend_verification").html("Resend verification.");this.$el.addClass("has-inactivity-box"),this.$inactivebox.html(a).append(" "+b).toggle(!!a).show()}else this.$el.removeClass("has-inactivity-box"),this.$inactivebox.hide();return this},renderPanels:function(){var a=this;return this._panelIds.forEach(function(b){_.has(a,b)?(a[b].setElement("#"+b),a[b].render()):"center"!==b&&a.center.$el.css(b,0)}),this},_template:function(){return['<div id="everything">','<div id="background"/>','<div id="messagebox"/>','<div id="inactivebox" class="panel-warning-message"/>','<div id="left"/>','<div id="center" class="inbound"/>','<div id="right"/>',"</div>",'<div id="dd-helper"/>',"<noscript>",'<div class="overlay overlay-background noscript-overlay">',"<div>",'<h3 class="title">Javascript Required for Galaxy</h3>',"<div>","The Galaxy analysis interface requires a browser with Javascript enabled.<br>","Please enable Javascript and refresh this page","</div>","</div>","</div>","</noscript>"].join("")},toString:function(){return"PageLayoutView"}});return{PageLayoutView:e}});
//# sourceMappingURL=../../maps/layout/page.js.map