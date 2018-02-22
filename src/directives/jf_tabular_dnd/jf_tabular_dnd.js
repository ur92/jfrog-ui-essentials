export function jfTabularDnD() {

    return {
        restrict: 'E',
        scope: {
            availableItems: '=',
            selectedItems: '=',
            columns: '=',
            availableItemsColumns: '=?',
            selectedItemsColumns: '=?',
            onChange: '&?',
            entityName: '@?',
            disabled: '=ngDisabled'
        },
        templateUrl: 'directives/jf_tabular_dnd/jf_tabular_dnd.html',
        controller: jfTabularDnDController,
        controllerAs: 'jfTabularDnD',
        bindToController: true,
    }
}

class jfTabularDnDController {
	/* @ngInject */
    constructor($element, $scope, JFrogTableViewOptions) {
        this.$scope = $scope;
        this.JFrogTableViewOptions = JFrogTableViewOptions;

        if (this.columns) {
            this.availableItemsColumns = _.cloneDeep(this.columns);
            this.selectedItemsColumns = _.cloneDeep(this.columns);
        }

        this.availableContainer = $($element).find('.available-table');
        this.selectedContainer = $($element).find('.selected-table');


        this.createTables();
    }

    createTables() {
        this.availableItemsTableOptions = new this.JFrogTableViewOptions(this.$scope);
        this.selectedItemsTableOptions = new this.JFrogTableViewOptions(this.$scope);

        this.availableItemsTableOptions._registerTabularDnd(this, 'available', this.selectedItemsTableOptions);
        this.selectedItemsTableOptions._registerTabularDnd(this, 'selected', this.availableItemsTableOptions);

        let {availableObjectName, selectedObjectName} = this._getObjectNames();

        this.availableItemsTableOptions.setColumns(this.availableItemsColumns)
            .setSelection(this.availableItemsTableOptions.MULTI_SELECTION)
            .setPaginationMode(this.availableItemsTableOptions.VIRTUAL_SCROLL)
            .showPagination(false)
            .setDraggable()
            .setRowsPerPage(8)
            .setObjectName(availableObjectName)
            .setEmptyTableText(!this.availableItems.length && !this.selectedItems.length ? 'No Data Found' : 'Drag Row Here');

        this.selectedItemsTableOptions.setColumns(this.selectedItemsColumns)
            .setSelection(this.selectedItemsTableOptions.MULTI_SELECTION)
            .setPaginationMode(this.selectedItemsTableOptions.VIRTUAL_SCROLL)
            .showPagination(false)
            .setDraggable()
            .setRowsPerPage(8)
            .setObjectName(selectedObjectName)
            .setEmptyTableText('Drag Row Here');

        let toggleSelection = (row) => {
            if (this.disabled) return;
            row.entity.$selected = !row.entity.$selected;
        }

        this.availableItemsTableOptions.on('row.clicked', toggleSelection);
        this.selectedItemsTableOptions.on('row.clicked', toggleSelection);

        this.availableItemsTableOptions.on('selection.change', () => {
            if (this.disabled) this.availableItemsTableOptions.clearSelection();
        });
        this.selectedItemsTableOptions.on('selection.change', () => {
            if (this.disabled) this.selectedItemsTableOptions.clearSelection();
        });

        this.$scope.$watch('jfTabularDnD.disabled', () => {
            if (this.disabled) {
                this.selectedItemsTableOptions.clearSelection();
                this.availableItemsTableOptions.clearSelection();
            }
        })

        this.availableItemsTableOptions.setData(this.availableItems);
        this.selectedItemsTableOptions.setData(this.selectedItems);
    }

    _getObjectNames() {

        let availableObjectName, selectedObjectName;

        if (this.entityName) {
            if (this.entityName.indexOf('/') !== -1) {
                let [single, plural] = this.entityName.split('/');
                availableObjectName = 'Available ' + single + '/' + 'Available ' + plural;
                selectedObjectName = 'Selected ' + single + '/' + 'Selected ' + plural;
            }
            else {
                availableObjectName = 'Available ' + this.entityName;
                selectedObjectName = 'Selected ' + this.entityName;
            }
        }
        else {
            availableObjectName = 'Available Item';
            selectedObjectName = 'Selected Item';
        }

        return {availableObjectName, selectedObjectName};
    }

    isIncludeListEmpty() {
        if (!this.selectedItemsTableOptions.dirCtrl) return true;
        return !this.selectedItemsTableOptions.getFilteredData().length;
    }

    isExcludeListEmpty() {
        if (!this.availableItemsTableOptions.dirCtrl) return true;
        return !this.availableItemsTableOptions.getFilteredData().length;
    }

    isIncludeListItemSelected() {
        if (!this.selectedItemsTableOptions.dirCtrl) return false;
        let selected = this.selectedItemsTableOptions.getSelected()
        let filtered = this.selectedItemsTableOptions.getFilteredData();
        selected = _.filter(selected, item => _.includes(filtered, item))
        return !!selected.length;
    }

    isExcludeListItemSelected() {
        if (!this.availableItemsTableOptions.dirCtrl) return false;
        let selected = this.availableItemsTableOptions.getSelected()
        let filtered = this.availableItemsTableOptions.getFilteredData();
        selected = _.filter(selected, item => _.includes(filtered, item))
        return !!selected.length;
    }

    excludeAll() {
        if (this.disabled) return;

        let selected = this.selectedItemsTableOptions.getSelected();
        selected.forEach(s => delete s.$selected);
        this.selectedItemsTableOptions.dirCtrl.allSelected = false;
        let filtered = this.selectedItemsTableOptions.getFilteredData();
        Array.prototype.splice.apply(this.availableItems, [this.availableItems.length, 0].concat(filtered));
        _.remove(this.selectedItems, i => _.includes(filtered, i));
        this._refreshBothTables();
        this._fireOnChange();
    }

    includeAll() {
        if (this.disabled) return;

        let selected = this.availableItemsTableOptions.getSelected();
        selected.forEach(s => delete s.$selected);
        this.availableItemsTableOptions.dirCtrl.allSelected = false;
        let filtered = this.availableItemsTableOptions.getFilteredData();
        Array.prototype.splice.apply(this.selectedItems, [this.selectedItems.length, 0].concat(filtered));
        _.remove(this.availableItems, i => _.includes(filtered, i));
        this._refreshBothTables();
        this._fireOnChange();
    }

    excludeSelected() {
        if (this.disabled) return;

        let selected = this.selectedItemsTableOptions.getSelected();
        selected.forEach(s => delete s.$selected);
        this.selectedItemsTableOptions.dirCtrl.allSelected = false;
        let filtered = this.selectedItemsTableOptions.getFilteredData();
        _.remove(selected, i => !_.includes(filtered, i));
        Array.prototype.splice.apply(this.availableItems, [this.availableItems.length, 0].concat(selected));
        _.remove(this.selectedItems, item => _.includes(selected, item));
        this._refreshBothTables();
        this._fireOnChange();
    }

    includeSelected() {
        if (this.disabled) return;

        let selected = this.availableItemsTableOptions.getSelected();
        selected.forEach(s => delete s.$selected);
        this.availableItemsTableOptions.dirCtrl.allSelected = false;
        let filtered = this.availableItemsTableOptions.getFilteredData();
        _.remove(selected, i => !_.includes(filtered, i));
        Array.prototype.splice.apply(this.selectedItems, [this.selectedItems.length, 0].concat(selected));
        _.remove(this.availableItems, item => _.includes(selected, item));
        this._refreshBothTables();
        this._fireOnChange();
    }

    _refreshBothTables() {
        [this.availableItemsTableOptions, this.selectedItemsTableOptions].forEach(tableOptions => {
            tableOptions.update();
            tableOptions.refreshFilter();
        })
    }

    onDragTransfer(draggedRows, originTableOptions) {
        draggedRows.forEach(draggedRow => delete draggedRow.$selected);
        originTableOptions.dirCtrl.allSelected = false;
        this._fireOnChange();
    }

    _fireOnChange() {
        if (this.onChange) this.onChange();
    }
}


