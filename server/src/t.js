"use strict";
exports.__esModule = true;
var ts_pattern_1 = require("ts-pattern");
(0, ts_pattern_1.match)({ a: 1, b: 2 })["with"]({ a: ts_pattern_1.P.select() }, function (keke) { return console.log(keke); })["with"]({ b: 1 }, function () { return console.log(2); })
    .otherwise(function () { });
