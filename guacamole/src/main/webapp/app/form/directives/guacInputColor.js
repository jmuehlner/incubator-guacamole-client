/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * A directive which implements a color input field, leveraging the "Pickr"
 * color picker. If the "Picker" color picker cannot be used because it relies
 * on JavaScript features not supported by the browser (Internet Explorer), a
 * "guacInputColorUnavailable" event will be emitted up the scope, and this
 * directive will become read-only, functioning essentially as a color preview.
 */
angular.module('form').directive('guacInputColor', [function guacInputColor() {

    var config = {
        restrict: 'E',
        replace: true,
        templateUrl: 'app/form/templates/guacInputColor.html',
        transclude: true
    };

    config.scope = {

        /**
         * The current selected color value, in standard 6-digit hexadecimal
         * RGB notation. When the user selects a different color using this
         * directive, this value will updated accordingly.
         *
         * @type String
         */
        model: '=',

        /**
         * An optional array of colors to include within the color picker as a
         * convenient selection of pre-defined colors. The colors within the
         * array must be in standard 6-digit hexadecimal RGB notation.
         *
         * @type String[]
         */
        palette: '='

    };

    config.controller = ['$scope', '$element', '$injector',
        function guacInputColorController($scope, $element, $injector) {

        // Required services
        var $q         = $injector.get('$q');
        var $translate = $injector.get('$translate');

        /**
         * Whether the color picker ("Pickr") cannot be used. In general, all
         * browsers should support Pickr with the exception of Internet
         * Explorer.
         *
         * @type Boolean
         */
        $scope.colorPickerUnavailable = false;

        /**
         * Returns whether the color currently selected is "dark" in the sense
         * that the color white will have higher contrast against it than the
         * color black.
         *
         * @returns {Boolean}
         *     true if the currently selected color is relatively dark (white
         *     text would provide better contrast than black), false otherwise.
         */
        $scope.isDark = function isDark() {

            // Assume not dark if color is invalid or undefined
            var rgb = $scope.model && /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec($scope.model);
            if (!rgb)
                return false;

            // Parse color component values as hexadecimal
            var red = parseInt(rgb[1], 16);
            var green = parseInt(rgb[2], 16);
            var blue = parseInt(rgb[3], 16);

            // Convert RGB to luminance in HSL space (as defined by the
            // relative luminance formula given by the W3C for accessibility)
            var luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

            // Consider the background to be dark if white text over that
            // background would provide better contrast than black
            return luminance <= 153; // 153 is the component value 0.6 converted from 0-1 to the 0-255 range

        };

        // Init color picker after required translation strings are available
        $q.all({
            'save'   : $translate('APP.ACTION_SAVE'),
            'cancel' : $translate('APP.ACTION_CANCEL')
        }).then(function stringsRetrieved(strings) {

            try {

                /**
                 * An instance of the "Pickr" color picker, bound to the underlying
                 * element of this directive.
                 *
                 * @type Pickr
                 */
                var pickr = Pickr.create({

                    // Bind color picker to the underlying element of this directive
                    el : $element[0],

                    // Wrap color picker dialog in Guacamole-specific class for
                    // sake of additional styling
                    appClass : 'guac-input-color-picker',

                    // Display color details as hex
                    defaultRepresentation : 'HEX',

                    // Use "monolith" theme, as a nice balance between "nano" (does
                    // not work in Internet Explorer) and "classic" (too big)
                    theme : 'monolith',

                    // Leverage the container element as the button which shows the
                    // picker, relying on our own styling for that button
                    useAsButton  : true,
                    appendToBody : true,

                    // Do not include opacity controls
                    lockOpacity : true,

                    // Include a selection of palette entries for convenience and
                    // reference
                    swatches : $scope.palette || [],

                    components: {

                        // Include hue and color preview controls
                        preview : true,
                        hue     : true,

                        // Display only a text color input field and the save and
                        // cancel buttons (no clear button)
                        interaction: {
                            input  : true,
                            save   : true,
                            cancel : true
                        }

                    },

                    // Use translation strings for buttons
                    strings : strings

                });

                // Hide color picker after user clicks "cancel"
                pickr.on('cancel', function colorChangeCanceled() {
                    pickr.hide();
                });

                // Keep model in sync with changes to the color picker
                pickr.on('save', function colorChanged(color) {
                    $scope.$evalAsync(function updateModel() {
                        $scope.model = color.toHEXA().toString();
                    });
                });

                // Keep color picker in sync with changes to the model
                pickr.on('init', function pickrReady(color) {
                    $scope.$watch('model', function modelChanged(model) {
                        pickr.setColor(model);
                    });
                });

            }

            // If the "Pickr" color picker cannot be loaded (Internet Explorer),
            // let the scope above us know
            catch (e) {
                $scope.colorPickerUnavailable = true;
                $scope.$emit('guacInputColorUnavailable', e);
            }

        }, angular.noop);

    }];

    return config;

}]);
