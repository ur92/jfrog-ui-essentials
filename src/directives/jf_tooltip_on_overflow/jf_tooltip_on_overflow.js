/*
 USAGE EXAMPLE:

 <jf-grid-filter
 filter-grid="gridOptions"  //the name of the grid (grid options)
 filter-field="fieldName"        //the name of the field that should be filtered
 filter-on-change>          //optional - don't use a button for filtering, filter on every change
 </jf-grid-filter>

 */

export function jfTooltipOnOverflow($sanitize) {

    return {
    	scope: {
    		trustTooltipText: '<?'
	    },
        restrict: 'A',
        link: ($scope, $element ) => {
	        $($element).on('mouseenter',(e)=>{
                let targets = [$($element), $(e.target)];
                let tooltipShown = false;
	            let isNoTooltip = (cell) => {
		            return (cell[0] && cell[0].classList && cell[0].classList.contains('no-tooltip'));
	            };

	            for (let i = 0; !tooltipShown && i < targets.length; i++) {
                    let target = targets[i];

	                let targetContent = target.children(':not(:visible)').length ? target.children(':visible').text().trim() : target.text().trim();
	                targetContent = (targetContent === '' ? null : $sanitize(targetContent));
		            if (!isNoTooltip(target) && target[0].scrollWidth > Math.round(target.innerWidth())) {
                        if (!!targetContent && !target.hasClass('tooltipstered')) {
                        	let options = {
		                        animation: 'fade',
		                        contentAsHTML : 'true',
		                        trigger: 'hover',
		                        onlyOne: 'true',
		                        interactive: 'true',
		                        position: 'bottom',
		                        theme: 'tooltipster-default bottom',
		                        content: targetContent
	                        };
	                        if($scope.trustTooltipText) {
		                        options.contentAsHTML = 'true';
	                        }
	                        target.tooltipster(options);
			                target.tooltipster('show');
		                }
		                else if (!!targetContent) {
			                target.tooltipster('enable');

			                if (target.tooltipster('content') != targetContent)
				                target.tooltipster('content', targetContent);
		                }
	                }
	                else if (target.hasClass('tooltipstered'))
		                target.tooltipster('disable');
                }
            });
            $scope.$on('$destroy', () => {
                $($element).off('mouseenter');
                $($element).off('mouseleave');
            });


        }
    };
}
