// config object description
// enableNgShow - (default false) enable tab switch with ngShow
// --

export default function jfWizard() {

	return {
		restrict: 'E',
		scope: {
			onTabSwitch: '&?',
			config : '<'
		},
		templateUrl: 'directives/jf_wizard/jf.wizard.view.html',
		controller: jfWizardController,
		controllerAs: '$ctrl',
		transclude: true,
		link: ($scope, element, attrs) => {

		}
	};
}

class jfWizardController {
	constructor($scope, JFrogEventBus, $element, JFrogUIUtils) {
		JFrogEventBus.registerOnScope($scope, JFrogEventBus.getEventsDefinition().WIZARD_TAB_CHANGE, tab => {
			this.switch(tab)
		});
		this.$scope = $scope;
		this.$element = $element;
        this.JFrogUIUtils = JFrogUIUtils;
		this.onTabSwitch = $scope.onTabSwitch;
        this.config = $scope.config;
		this.init = true;
		this.tabs = [];
	}

	registerTab(tab) {
		if (this.init || tab.isSelectedTab) {
			this.active = tab;
			this.init = false;
		}
		this.tabs.push(tab);
	}

	switch(tab) {
		this.$element.find('.wizard-content').scrollTop(0);
		this.active = (typeof tab === 'string') ? _.find(this.tabs, t => t.title === tab) : tab;
		if (this.onTabSwitch) {
			this.onTabSwitch({tab: this.active.title});
		}
        this.JFrogUIUtils.fireResizeEvent();
	}

	isVisible(tab) {
		return !tab.isVisibleTab || (typeof tab.isVisibleTab === 'function' && tab.isVisibleTab());
	}
}