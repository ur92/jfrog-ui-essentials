import {JFTreeApi} from "./jf_tree_api";
import {jfTree} from "./jf_tree";
import {jfTreeItem} from "./jf_tree_item";
import {jfTreeCompiledCell} from "./jf_tree_compiled_cell";
import {jfTreeIndentation} from "./jf_tree_indentation";

export default angular.module('jf_tree', [])
	.directive('jfTree', jfTree)
	.directive('jfTreeItem', jfTreeItem)
	.directive('jfTreeCompiledCell', jfTreeCompiledCell)
	.directive('jfTreeIndentation', jfTreeIndentation)
	.factory('JFTreeApi', JFTreeApi);
