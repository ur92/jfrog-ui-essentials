export class TreeViewPane {
    constructor(viewPaneName, treeApi) {
        this.viewPaneName = viewPaneName;
        this.treeApi = treeApi;
        this.$flatItems = [];

        this.itemHeight = '50px';
        this.itemsPerPage = 25;
    }

    setItemsPerPage(rpp) {
        this.itemsPerPage = rpp;
        return this;
    }

    setItemHeight(height) {
        this.itemHeight = height;
        return this;
    }

    update(notifyTree = true) {
        this.refreshFilter();
        if (this.dirCtrl) {
            this.dirCtrl.refresh();
        }

        if (this.autoHeight) this._setAutoItemsPerPage();
        if (notifyTree) this.treeApi.onViewUpdate(this);
    }

    _setDirectiveController(directiveController) {
        this.dirCtrl = directiveController;
        this.dirCtrl.viewPane = this;

        if (this.itemsPerPage === 'auto') {
            this.autoHeight = true;
            this._setAutoItemsPerPage();
        }

    }

    _setAutoItemsPerPage() {
        this.treeApi.$timeout(() => {
            let containerHeight = $(this.dirCtrl.$element).parent().height();
            this.setItemsPerPage(Math.floor(containerHeight / parseFloat(this.itemHeight)));
        })
    }

    _getPageData() {
        let prePage = this._getPrePagedData();
        return prePage.slice(this.dirCtrl.virtualScrollIndex,
            this.dirCtrl.virtualScrollIndex + this.itemsPerPage + (this.dirCtrl.virtualScrollIndex + this.itemsPerPage < prePage.length ? 1 : 0));
    }

    _getPrePagedData() {
        return this._getSortedData(this._getFilteredData(this._getRawData()));
    }

    _getSortedData(sourceData) {
        return sourceData;
    }

    _getFilteredData(sourceData) {
        sourceData = sourceData || this._getRawData();
        if (this.treeApi.filterCallbcak && sourceData.length) {
            if (!this.filterCache) {
                this.filterCache = _.filter(sourceData, item => {
                    let parentIsFilteredOut = false;
                    let curr = item.parent;
                    while (curr && !parentIsFilteredOut) {
                        if (curr.data !== this.treeApi.GO_UP_NODE && !this.treeApi.filterCallbcak(curr.data)) {
                            parentIsFilteredOut = true;
                        }
                        curr = curr.parent;
                    }

                    return item.data === this.treeApi.GO_UP_NODE || !parentIsFilteredOut && this.treeApi.filterCallbcak(item.data);
                })
            }
            return this.filterCache;
        }
        else {
            return sourceData;
        }
    }

    refreshFilter() {
        delete this.filterCache;
    }

    _getRawData() {
        return this.$freezedItems || this.$flatItems || [];
    }

    _freeze() {
        if (this.treeApi.$userFreeze) return;
        this.$freezedItems = [].concat(this.$flatItems);
        this.$freezedOpened = [].concat(this.treeApi.$openedNodes);
        this.$freezed = true;
    }

    _unFreeze() {
        if (this.treeApi.$userFreeze) return;

        delete this.$freezedItems;
        delete this.$freezedOpened;
        this.$freezed = false;

        this.refreshFilter();
    }

    _addChildren(children, level = 0, parent = null) {
        let parentIndex = this.$flatItems.indexOf(parent);
        let added = [];
        children.forEach((node) => {
            let flatItem = this._createFlatItem(node, level, parent);
            added.push(flatItem);
            if (this.treeApi.isNodeOpen(node, true)) {
                this.treeApi.getChildren(node).then(_children => {
                    if (_children && _children.length) {
                        this._addChildren(_children, level + 1, flatItem);
                    }
                })
            }
        })
        let before = this.$flatItems.slice(0, parentIndex + 1);
        let after = this.$flatItems.slice(parentIndex + 1);
        this.$flatItems = before.concat(added).concat(after);
        this.update();
    }

    _removeChildren(parent) {
        this.$flatItems = _.filter(this.$flatItems, flat => {
            let remove = false;
            let _parent = flat.parent;
            while (_parent) {
                if (_parent  === parent) {
                    remove = true;
                    break;
                }
                _parent = _parent.parent;
            }
            return !remove;
        })
        this.update();

    }

    _buildFlatItems() {
        this.$flatItems = [];
        let paneRoot = _.filter(this.treeApi.$root, node => {
            return this.treeApi.paneSelector(node) === this.viewPaneName;
        })
        this._addChildren(paneRoot);
    }

    _createFlatItem(node, level = 0, parent = null) {
        let flat = {
            pane: this,
            data: node,
            level,
            parent,
            hasChildren: undefined
        }

        if (this.treeApi.childrenChecker) {
            let check = this.treeApi.childrenChecker(node);
            if (check && check.then) {
                check.then((_check) => {
                    flat.hasChildren = _check;
                })
            }
            else flat.hasChildren = check;
        }
        else {
            this.treeApi.getChildren(node).then(children => {
                flat.hasChildren = !!(children && children.length);
            });
        }

        return flat;
    }

    _recursiveOpenRestore(node) {
        let defer = this.treeApi.$q.defer();

        let id = this.treeApi.uniqueIdGetter(node);
        let opened = _.find(this.treeApi.$openedNodes, n => this.treeApi.uniqueIdGetter(n) === id);
        if (opened) {
            _.remove(this.treeApi.$openedNodes, n => n === opened);
            this.treeApi.openNode(node).then(() => {
                let children = node.$childrenCache;
                if (!children || !children.length) defer.resolve();
                else {
                    let pendingPromises = children.length;
                    children.forEach(child => {
                        this._recursiveOpenRestore(child).then(() => {
                            pendingPromises--;
                            if (pendingPromises === 0) {
                                defer.resolve();
                            }
                        })
                    })
                }
            })
        }
        else {
            defer.resolve();
        }

        return defer.promise;
    }

    refreshNode(node) {
        let defer = this.treeApi.$q.defer();
        let flat = this._flatFromNode(node);
        if (flat) {
            this._freeze();
            this._removeChildren(flat);
            delete flat.data.$childrenCache;
            this.refreshNodeContextMenu(flat.data);
            this._recursiveOpenRestore(flat.data).then(() => {
                this._unFreeze();
                defer.resolve();
            });
        }
        return defer.promise;
    }

    refreshNodeContextMenu(node) {
        delete node.$cachedCMItems;
    }

    refreshView() {
        let mainDefer = this.treeApi.$q.defer();

        this._freeze();
        this.treeApi._getRoot().then(() => {
            if (this.treeApi.uniqueIdGetter) {
                let resolveCount = 0;
                let itemsCount = this.$flatItems.length;
                if (!this.$flatItems.length) mainDefer.resolve();
                this.$flatItems.forEach((fi, ind) => {
                    this._recursiveOpenRestore(fi.data).then(() => {
                        resolveCount++;
                        if (resolveCount === itemsCount) {
                            let selectedId = this.treeApi.$selectedNode ? this.treeApi.uniqueIdGetter(this.treeApi.$selectedNode) : null;
                            let newSelected = selectedId !== null ? _.find(this.$flatItems, fi => fi.data !== this.treeApi.GO_UP_NODE && this.treeApi.uniqueIdGetter(fi.data) === selectedId) : null;
                            if (newSelected) {

                                this.treeApi._setSelected(newSelected);
                                this._unFreeze();
                                mainDefer.resolve();
                            }
                            else if (selectedId) {
                                this.treeApi.nodeByIdGetter(selectedId).then(node => {
                                    this._unFreeze();
                                    this.treeApi.openDeepNode(node).then(() => {
                                        mainDefer.resolve();
                                    })
                                }).catch(() => {
                                    this.selectFirst();
                                    this._unFreeze();
                                    mainDefer.resolve();
                                })
                            }
                            else {
                                this._unFreeze();
                                mainDefer.resolve();
                            }
                        }
                    })
                })
            }
        })

        return mainDefer.promise;
    }

    selectFirst() {
        if (this._getPrePagedData().length) this.treeApi._setSelected(this._getPrePagedData()[0])
    }

    getQuickFindMatches() {
        if (!this.treeApi.quickFindTerm) return [];
        else {
            let matches = _.filter(this.$flatItems, (fi, ind) => {
                let text = this.treeApi.textGetter(fi.data);
                let matchObj = this.treeApi.AdvancedStringMatch.match(text, this.treeApi.quickFindTerm);
                let matched = matchObj ? matchObj.matched : null;
                if (matched) fi.$$index = ind;
                return matched;
            })

            if (this.treeApi.$selectedNode) {
                let selectedIndex = _.findIndex(this.$flatItems, fi => fi.data === this.treeApi.$selectedNode);
                let matchesAfterSelection = _.filter(matches, match => {
                    return match.$$index >= selectedIndex;
                });
                let matchesBeforeSelection = _.difference(matches, matchesAfterSelection);

                matches = matchesAfterSelection.concat(matchesBeforeSelection);
            }

            return matches;
        }
    }

    centerOnNode(node) {
        let flat = this._flatFromNode(node);
        if (flat) this.centerOnItem(flat);
    }

    _flatFromNode(node) {
        let refMatch = _.find(this.$flatItems, flat => flat.data === node);
        if (!refMatch) {
            let nodeId = this.treeApi.uniqueIdGetter(node);
            let idMatch = _.find(this.$flatItems, flat => {
                if (flat.data === this.treeApi.GO_UP_NODE) return false;
                else {
                    let flatId = this.treeApi.uniqueIdGetter(flat.data);
                    return  flatId === nodeId;
                }
            });
            return idMatch;
        }
        return refMatch;
    }

    centerOnItem(item) {
        let index = this._getPrePagedData().indexOf(item);
        let halfPage = Math.floor(this.itemsPerPage / 2);
        if (this._getPrePagedData().length <= this.itemsPerPage || index - halfPage < 0) {
            this.dirCtrl.virtualScrollIndex = 0;
        }
        else if (index + (this.itemsPerPage - halfPage) > this._getPrePagedData().length) {
            this.dirCtrl.virtualScrollIndex = this._getPrePagedData().length - this.itemsPerPage;
        }
        else {
            this.dirCtrl.virtualScrollIndex = index - halfPage;
        }

        this.dirCtrl.syncFakeScroller(false);
        this.treeApi._setSelected(item);
    }

    focus() {
        if (this.dirCtrl) $(this.dirCtrl.$element).find('.jf-tree').focus();
    }

    findNode(findFunction) {
        let item = _.find(this.$flatItems, fi => {
            return fi.data !== this.treeApi.GO_UP_NODE && findFunction(fi.data);
        })
        if (item) return item.data;
    }

    findNodeByUniqueId(uniqueId) {
        let item = _.find(this.$flatItems, fi => {
            return this.treeApi.uniqueIdGetter(fi.data) === uniqueId;
        })
        if (item) return item.data;
    }

    isNodeOpen(node, ignoreFreeze = false) {
        return (!ignoreFreeze && this.$freezedOpened && _.includes(this.$freezedOpened, node)) || (!this.$freezedOpened && _.includes(this.treeApi.$openedNodes, node));
    }

    getNodesCount() {
        return this._getRawData().length;
    }

    getFilteredNodesCount() {
        return this._getFilteredData().length;
    }

}