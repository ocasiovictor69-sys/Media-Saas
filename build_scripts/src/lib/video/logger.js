"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logStep = logStep;
function logStep(step) {
    var time = new Date().toISOString();
    console.log("[".concat(time, "] \u25B6 ").concat(step));
}
