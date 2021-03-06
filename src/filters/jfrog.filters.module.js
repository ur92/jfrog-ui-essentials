import {FileSize} from './filesize';
import {FormatedNumber} from './formatedNumber';
import {SplitWords} from './split_words';

export default angular.module('jfrog.ui.essentials.filters', [])
        .filter('filesize', FileSize)
        .filter('formatedNumber', FormatedNumber)
        .filter('splitWords', SplitWords);
