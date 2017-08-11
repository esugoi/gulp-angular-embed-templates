var fs = require('fs');
var pathModule = require('path');
var Minimize = require('minimize');

var extend = require('./utils').extend;
var Angular1Processor = require('./Angular1Processor');

const STYLE_BEGIN = Buffer('styles: [\'');
const STYLE_END = Buffer('\']');

function escapeSingleQuotes(string) {
    const ESCAPING = {
        '\'': '\\\'',
        '\\': '\\\\',
        '\n': '\\n',
        '\r': '\\r',
        '\u2028': '\\u2028',
        '\u2029': '\\u2029'
    };
    return string.replace(/['\\\n\r\u2028\u2029]/g, function (character) {
        return ESCAPING[character];
    });
}

var Angular2StyleProcessor = extend(Angular1Processor, {
    /**
     * @override
     */
    getPattern : function() {
        // for typescript: 'styleUrls: string = ["style.css"]'
        return '[\'"]?styleUrls[\'"]?[\\s]*:[\\s]*[\\s]*[\\[][\\s]*[\'"`]([^\'"`]+)[\'"`][\\s]*[\\]]';
    },

    /**
     * @override
     */
    embedTemplate : function(match, styleBuffer) {
        return {
            start : match.index,
            length: match[0].length,
            replace: [STYLE_BEGIN, styleBuffer, STYLE_END]
        }
    },

    /**
     * @override
     */
    replaceMatch : function(fileContext, match, cb, onErr) {
        var relativeStylePath = match[1];
        var stylePath = pathModule.join(fileContext.path, relativeStylePath);
        var warnNext = function(msg) {
            this.logger.warn(msg);
            cb();
        }.bind(this);
        var onError = this.config.skipErrors ? warnNext : onErr;

        this.logger.debug('style path: %s', stylePath);

        if (this.config.maxSize) {
            var fileStat = fs.statSync(stylePath);
            if (fileStat && fileStat.size > this.config.maxSize) {
                warnNext('style file "' + stylePath + '" exceeds configured max size "' + this.config.maxSize + '" actual size is "' + fileStat.size + '"');
                return;
            }
        }

        var embedTemplate = this.embedTemplate.bind(this);
        var minimizer = this.minimizer;
        fs.readFile(stylePath, {encoding: this.config.templateEncoding}, function(err, templateContent) {
            if (err) {
                onError('Can\'t read style file: "' + stylePath + '". Error details: ' + err);
                return;
            }

            minimizer.parse(templateContent, function (err, minifiedContent) {
                if (err) {
                    onError('Error while minifying angular template "' + stylePath + '". Error from "minimize" plugin: ' + err);
                    return;
                }

                var styleBuffer = Buffer(escapeSingleQuotes(minifiedContent));
                cb(embedTemplate(match, styleBuffer));
            });
        });
    },
});

module.exports = Angular2StyleProcessor;