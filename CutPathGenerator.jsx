#target illustrator
#targetengine "main"

/*
  CutPathGenerator for Adobe Illustrator

  1) Cắt thẳng: tạo đường chạy liên tục theo lưới vuông/chữ nhật.
  2) Cắt tròn / oval: mỗi dãy gồm các đường tròn hoặc ellipse nối tiếp.

  Chọn kích thước, số lượng, hướng và khoảng cách theo nhu cầu.
  Dùng đơn vị của tài liệu hiện hành; không tạo tài liệu mới.
  Kiểm tra trước kích thước bounds và stroke theo sức chứa toàn canvas.
  Mỗi ô số cho phép tối đa 3 chữ số thập phân.
*/

(function () {
    var KAPPA = 0.5522847498;
    var UNIT_TO_PT = {
        'mm': 72 / 25.4,
        'cm': 72 / 2.54,
        'in': 72,
        'pt': 1,
        'pica': 12,
        'px': 1
    };

    function getDocumentUnit(doc) {
        var ruler = doc.rulerUnits;
        if (ruler === RulerUnits.Millimeters) return {name: 'mm', factor: UNIT_TO_PT.mm};
        if (ruler === RulerUnits.Centimeters) return {name: 'cm', factor: UNIT_TO_PT.cm};
        if (ruler === RulerUnits.Inches) return {name: 'in', factor: UNIT_TO_PT.in};
        if (ruler === RulerUnits.Points) return {name: 'pt', factor: UNIT_TO_PT.pt};
        if (ruler === RulerUnits.Picas) return {name: 'pica', factor: UNIT_TO_PT.pica};
        if (ruler === RulerUnits.Pixels) return {name: 'px', factor: UNIT_TO_PT.px};
        return {name: 'pt', factor: UNIT_TO_PT.pt};
    }

    function toPt(value, unit) {
        if (typeof UNIT_TO_PT[unit] === 'undefined') return NaN;
        return value * UNIT_TO_PT[unit];
    }

    function number(value) {
        return parseFloat(String(value).replace(',', '.'));
    }

    function positive(value) {
        return !isNaN(value) && isFinite(value) && value > 0;
    }

    function nonNegative(value) {
        return !isNaN(value) && isFinite(value) && value >= 0;
    }

    function positiveInteger(value) {
        return !isNaN(value) && isFinite(value) && value >= 1 && Math.floor(value) === value;
    }

    function getWorkspaceLimit(doc) {
        var standardLimit = 227 * 72;
        var largeCanvasLimit = 2270 * 72;
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        var isLargeCanvas = false;
        var i;
        var rect;
        var width;
        var height;

        for (i = 0; i < doc.artboards.length; i++) {
            rect = doc.artboards[i].artboardRect;
            width = Math.abs(rect[2] - rect[0]);
            height = Math.abs(rect[1] - rect[3]);
            minX = Math.min(minX, rect[0], rect[2]);
            maxX = Math.max(maxX, rect[0], rect[2]);
            minY = Math.min(minY, rect[3], rect[1]);
            maxY = Math.max(maxY, rect[3], rect[1]);
            if (width > standardLimit || height > standardLimit) isLargeCanvas = true;
        }

        // Illustrator can create a large canvas for a large artboard or a spread of artboards.
        if (maxX - minX > standardLimit || maxY - minY > standardLimit) isLargeCanvas = true;
        try {
            if (doc.width > standardLimit || doc.height > standardLimit) isLargeCanvas = true;
        } catch (e) {}

        return isLargeCanvas ? largeCanvasLimit : standardLimit;
    }

    function checkWorkspaceFit(doc, pathWidth, pathHeight, stroke) {
        var workspaceLimit = getWorkspaceLimit(doc);
        // Include half the stroke at each outer edge (one full stroke per dimension).
        var requiredWidth = pathWidth + stroke;
        var requiredHeight = pathHeight + stroke;
        var tolerance = 0.01; // points; avoids false overflow from floating-point rounding.
        return {
            fits: isFinite(requiredWidth) && isFinite(requiredHeight) &&
                requiredWidth <= workspaceLimit + tolerance &&
                requiredHeight <= workspaceLimit + tolerance,
            requiredWidth: requiredWidth,
            requiredHeight: requiredHeight,
            workspaceWidth: workspaceLimit,
            workspaceHeight: workspaceLimit
        };
    }

    function formatDimension(points, unitName) {
        var value = points / UNIT_TO_PT[unitName];
        if (!isFinite(value)) return String(value);
        return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    }

    function showWorkspaceOverflow(fit, unitName) {
        var requested = formatDimension(fit.requiredWidth, unitName) + ' × ' +
            formatDimension(fit.requiredHeight, unitName) + ' ' + unitName;
        var available = formatDimension(fit.workspaceWidth, unitName) + ' × ' +
            formatDimension(fit.workspaceHeight, unitName) + ' ' + unitName;
        showLocalizedAlert(
            'Thiết kế gồm cả nét cần ' + requested + ', vượt giới hạn toàn vùng làm việc Illustrator ' + available + '. Hãy giảm kích thước, số lượng hoặc khoảng cách.',
            'The design including stroke needs ' + requested + ', exceeding Illustrator workspace capacity (' + available + '). Reduce dimensions, count, or spacing.');
    }

    function addField(parent, label, value, decimalPlaces, suffix) {
        var row = parent.add('group');
        row.orientation = 'row';
        row.alignChildren = ['left', 'center'];

        var text = row.add('statictext', undefined, label);
        text.preferredSize.width = 195;

        var input = row.add('edittext', undefined, String(value));
        input.characters = 7;
        input.preferredSize.width = 82;
        input._label = text;
        input._row = row;
        if (suffix) row.add('statictext', undefined, suffix);

        input.onChanging = function () {
            var raw = String(input.text).replace(',', '.');
            var filtered = '';
            var hasDot = false;
            var decimals = 0;
            var i;

            for (i = 0; i < raw.length; i++) {
                var ch = raw.charAt(i);
                if (ch >= '0' && ch <= '9') {
                    if (!hasDot || decimals < decimalPlaces) {
                        filtered += ch;
                        if (hasDot) decimals++;
                    }
                } else if (ch === '.' && !hasDot && decimalPlaces > 0) {
                    hasDot = true;
                    filtered += ch;
                }
            }
            if (input.text !== filtered) input.text = filtered;
        };

        input.onChange = function () {
            var valueNumber = parseFloat(input.text);
            if (!isNaN(valueNumber)) {
                if (decimalPlaces === 0) {
                    input.text = valueNumber.toFixed(0);
                } else {
                    input.text = valueNumber.toFixed(decimalPlaces)
                        .replace(/0+$/, '')
                        .replace(/\.$/, '');
                }
            }
        };
        return input;
    }

    function readUserPreferences() {
        var result = {};
        try {
            var folder = new Folder(Folder.userData.fsName + '/Custom_Path_Generator');
            var file = new File(folder.fsName + '/preferences.txt');
            if (!file.exists || !file.open('r')) return result;
            var lines = file.read().split(/\r?\n/);
            file.close();
            var i;
            for (i = 0; i < lines.length; i++) {
                var cut = lines[i].indexOf('=');
                if (cut > 0) result[lines[i].substring(0, cut)] = lines[i].substring(cut + 1);
            }
        } catch (e) {}
        return result;
    }

    var savedPreferences = readUserPreferences();
    var uiLanguage = savedPreferences.language === 'en' ? 'en' : 'vi';
    var localizedControls = [];

    function bindLocalized(control, vi, en) {
        control._viText = vi;
        control._enText = en;
        localizedControls.push(control);
        control.text = uiLanguage === 'en' ? en : vi;
        return control;
    }

    function addLocalized(parent, type, vi, en) {
        return bindLocalized(parent.add(type, undefined, vi), vi, en);
    }

    function updateLocalizedTexts() {
        var i;
        for (i = 0; i < localizedControls.length; i++) {
            localizedControls[i].text = uiLanguage === 'en'
                ? localizedControls[i]._enText
                : localizedControls[i]._viText;
        }
    }

    function showLocalizedAlert(vi, en) {
        alert(uiLanguage === 'en' ? en : vi);
    }

    function getCutPathColor(doc) {
        var spot;
        var i;
        for (i = 0; i < doc.spots.length; i++) {
            if (doc.spots[i].name === 'Cut Path') {
                spot = doc.spots[i];
                break;
            }
        }
        if (!spot) {
            spot = doc.spots.add();
            spot.name = 'Cut Path';
        }
        spot.colorType = ColorModel.SPOT;
        var cmyk = new CMYKColor();
        cmyk.cyan = 0;
        cmyk.magenta = 100;
        cmyk.yellow = 100;
        cmyk.black = 0;
        spot.color = cmyk;

        var color = new SpotColor();
        color.spot = spot;
        color.tint = 100;
        return color;
    }

    function point(x, y) {
        return {a: [x, y], l: [x, y], r: [x, y]};
    }

    function addPoint(points, x, y) {
        var p = point(x, y);
        points.push(p);
        return p;
    }

    function samePoint(a, b) {
        return Math.abs(a[0] - b[0]) < 0.00001 &&
            Math.abs(a[1] - b[1]) < 0.00001;
    }

    function beginAt(points, x, y) {
        if (points.length === 0) return addPoint(points, x, y);
        var last = points[points.length - 1];
        if (!samePoint(last.a, [x, y])) return addPoint(points, x, y);
        return last;
    }

    // ---------------- Connected Circle / Ellipse ----------------

    function addHalf(points, x0, x1, baseline, ry, upper, forward) {
        var cx = (x0 + x1) / 2;
        var rx = (x1 - x0) / 2;
        var sign = upper ? 1 : -1;
        var extreme = [cx, baseline + sign * ry];
        var start = forward ? [x0, baseline] : [x1, baseline];
        var end = forward ? [x1, baseline] : [x0, baseline];
        var p0 = beginAt(points, start[0], start[1]);

        if (forward) {
            p0.r = [x0, baseline + sign * KAPPA * ry];
            var p1 = addPoint(points, extreme[0], extreme[1]);
            p1.l = [cx - KAPPA * rx, extreme[1]];
            p1.r = [cx + KAPPA * rx, extreme[1]];
            var p2 = addPoint(points, end[0], end[1]);
            p2.l = [x1, baseline + sign * KAPPA * ry];
        } else {
            p0.r = [x1, baseline + sign * KAPPA * ry];
            var q1 = addPoint(points, extreme[0], extreme[1]);
            q1.l = [cx + KAPPA * rx, extreme[1]];
            q1.r = [cx - KAPPA * rx, extreme[1]];
            var q2 = addPoint(points, end[0], end[1]);
            q2.l = [x0, baseline + sign * KAPPA * ry];
        }
    }

    function createScallop(doc, group, left, baseline, width, height,
                           arcCount, firstUpper, stroke, strokeColor,
                           vertical, originX, originY) {
        var rx = width / 2;
        var ry = height / 2;
        var points = [];
        var i;

        for (i = 0; i < arcCount; i++) {
            var x0 = left + i * width;
            var x1 = x0 + width;
            var upperForward = (i % 2 === 0) ? firstUpper : !firstUpper;
            addHalf(points, x0, x1, baseline, ry, upperForward, true);
        }

        for (i = arcCount - 1; i >= 0; i--) {
            var rx0 = left + i * width;
            var rx1 = rx0 + width;
            var upperForwardBack = (i % 2 === 0) ? firstUpper : !firstUpper;
            addHalf(points, rx0, rx1, baseline, ry, !upperForwardBack, false);
        }

        var path = doc.activeLayer.pathItems.add();
        path.name = 'Cut Path';
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = stroke;
        path.strokeColor = strokeColor;

        function map(p) {
            return vertical
                ? [originX + p[1], originY + p[0]]
                : [originX + p[0], originY + p[1]];
        }

        for (i = 0; i < points.length; i++) {
            var pathPoint = path.pathPoints.add();
            pathPoint.anchor = map(points[i].a);
            pathPoint.leftDirection = map(points[i].l);
            pathPoint.rightDirection = map(points[i].r);
            pathPoint.pointType = PointType.SMOOTH;
        }
        path.move(group, ElementPlacement.PLACEATEND);
    }

    function createConnectedMode(doc, values, unitName) {
        var width = toPt(values.width, unitName);
        var height = values.circle ? width : toPt(values.height, unitName);
        var pathGap = toPt(values.pathGap, unitName);
        var stroke = toPt(values.stroke, unitName);
        var count = values.count;
        var pathCount = values.pathCount;
        var length = count * width;
        var totalWidth = values.vertical
            ? pathCount * height + (pathCount - 1) * pathGap
            : length;
        var totalHeight = values.vertical
            ? length
            : pathCount * height + (pathCount - 1) * pathGap;
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        var abCx = (ab[0] + ab[2]) / 2;
        var abCy = (ab[1] + ab[3]) / 2;
        var group = doc.activeLayer.groupItems.add();
        group.name = 'Cut Path';
        var strokeColor = getCutPathColor(doc);
        var p;

        for (p = 0; p < pathCount; p++) {
            if (values.vertical) {
                var originX = abCx - totalWidth / 2 + height / 2 + p * (height + pathGap);
                var originY = abCy - length / 2;
                createScallop(doc, group, 0, 0, width, height, count,
                    false, stroke, strokeColor, true, originX, originY);
            } else {
                var left = abCx - totalWidth / 2;
                var baseline = abCy + totalHeight / 2 - height / 2 - p * (height + pathGap);
                createScallop(doc, group, left, baseline, width, height, count,
                    false, stroke, strokeColor, false, 0, 0);
            }
        }
        return group;
    }

    // ---------------- Connected Circle/Ellipse contour with gap arcs ----------------

    function createGapArcMode(doc, values) {
        var count = values.count;
        var width = values.width;
        var height = values.height;
        var arcGap = values.arcGap;
        var pathGap = values.pathGap;
        var pathCount = values.pathCount;
        var vertical = values.vertical;
        var totalLength = count * width + Math.max(0, count - 1) * arcGap;
        // The requested value is the clear edge-to-edge gap. The baseline
        // pitch must therefore be one path depth plus that clear gap.
        var pathDepth = count > 1 ? Math.max(height, arcGap) : height;
        var pathPitch = pathDepth + pathGap;
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        var centerX = (ab[0] + ab[2]) / 2;
        var centerY = (ab[1] + ab[3]) / 2;
        var group = doc.activeLayer.groupItems.add();
        group.name = 'Cut Path';
        var strokeColor = getCutPathColor(doc);
        var rowPaths = [];
        var p, i;

        for (p = 0; p < pathCount; p++) {
            var points = [];
            var left = vertical
                ? centerY - totalLength / 2
                : centerX - totalLength / 2;
            var baseline = vertical
                ? centerX - ((pathCount - 1) * pathPitch) / 2 + p * pathPitch
                : centerY + ((pathCount - 1) * pathPitch) / 2 - p * pathPitch;

            // Outer/top edge: large upper semicircles and small lower gap semicircles.
            for (i = 0; i < count; i++) {
                var x0 = left + i * (width + arcGap);
                addHalf(points, x0, x0 + width, baseline, height / 2, true, true);
                if (i < count - 1 && arcGap > 0) {
                    addHalf(points, x0 + width, x0 + width + arcGap,
                        baseline, arcGap / 2, false, true);
                }
            }

            // Return edge: lower large semicircles and upper gap semicircles.
            for (i = count - 1; i >= 0; i--) {
                var rx0 = left + i * (width + arcGap);
                addHalf(points, rx0, rx0 + width, baseline, height / 2, false, false);
                if (i > 0 && arcGap > 0) {
                    addHalf(points, rx0 - arcGap, rx0,
                        baseline, arcGap / 2, true, false);
                }
            }

            var path = doc.activeLayer.pathItems.add();
            path.name = 'Cut Path';
            path.closed = true;
            path.filled = false;
            path.stroked = true;
            path.strokeWidth = values.stroke;
            path.strokeColor = strokeColor;

            function map(q) {
                return vertical ? [baseline + q[1], left + q[0]] : [left + q[0], baseline + q[1]];
            }
            for (i = 0; i < points.length; i++) {
                var pp = path.pathPoints.add();
                pp.anchor = map(points[i].a);
                pp.leftDirection = map(points[i].l);
                pp.rightDirection = map(points[i].r);
                pp.pointType = PointType.SMOOTH;
            }
            path.move(group, ElementPlacement.PLACEATEND);
            rowPaths.push(path);
        }

        // Position each completed row from its actual geometric bounds.
        // This prevents a doubled offset from turning a 3 mm clear gap into
        // a diameter-plus-gap distance in the exported artwork.
        for (p = 0; p < pathCount; p++) {
            var rowBounds = rowPaths[p].geometricBounds;
            var currentPerpCenter = vertical
                ? (rowBounds[0] + rowBounds[2]) / 2
                : (rowBounds[1] + rowBounds[3]) / 2;
            var targetPerpCenter = vertical
                ? centerX - ((pathCount - 1) * pathPitch) / 2 + p * pathPitch
                : centerY + ((pathCount - 1) * pathPitch) / 2 - p * pathPitch;
            if (vertical) {
                rowPaths[p].translate(targetPerpCenter - currentPerpCenter, 0);
            } else {
                rowPaths[p].translate(0, targetPerpCenter - currentPerpCenter);
            }
        }

        // Re-center from the actual Illustrator bounds to avoid accumulated
        // coordinate offsets when gap arcs or multiple rows are present.
        var bounds = group.geometricBounds;
        var actualCenterX = (bounds[0] + bounds[2]) / 2;
        var actualCenterY = (bounds[1] + bounds[3]) / 2;
        group.translate(centerX - actualCenterX, centerY - actualCenterY);
        return group;
    }

    // ---------------- Zigzag Grid ----------------

    function appendZigzagPoint(points, x, y) {
        var last;
        if (points.length > 0) {
            last = points[points.length - 1];
            if (Math.abs(last[0] - x) < 0.0001 && Math.abs(last[1] - y) < 0.0001) return;
        }
        points.push([x, y]);
    }

    function createZigzagMode(doc, values, unitName) {
        var cellWidth = toPt(values.cellWidth, unitName);
        var cellHeight = toPt(values.cellHeight, unitName);
        var gap = toPt(values.gap, unitName);
        var margin = toPt(values.margin, unitName);
        var stroke = toPt(values.stroke, unitName);
        var columns = values.columns;
        var rows = values.rows;
        var gridWidth = columns * cellWidth + Math.max(0, columns - 1) * gap;
        var gridHeight = rows * cellHeight + Math.max(0, rows - 1) * gap;
        var pathWidth = gridWidth + 2 * margin;
        var pathHeight = gridHeight + 2 * margin;
        var points = [];
        var r;
        var c;
        var yTop;
        var yBottom;
        var yNext;
        var xStart;
        var xEnd;
        var xLeft;
        var xRight;
        var xNext;

        if (gap <= 0.000001) {
            for (r = 0; r <= rows; r++) {
                yTop = margin + r * cellHeight;
                xStart = (r % 2 === 0) ? 0 : pathWidth;
                xEnd = (r % 2 === 0) ? pathWidth : 0;
                appendZigzagPoint(points, xStart, pathHeight - yTop);
                appendZigzagPoint(points, xEnd, pathHeight - yTop);
                if (r < rows) {
                    yNext = margin + (r + 1) * cellHeight;
                    appendZigzagPoint(points, xEnd, pathHeight - yNext);
                }
            }

            for (c = 0; c <= columns; c++) {
                if (rows % 2 === 0) {
                    xLeft = cellWidth * columns + margin - c * cellWidth;
                } else {
                    xLeft = margin + c * cellWidth;
                }
                yTop = (c % 2 === 0) ? pathHeight : 0;
                yBottom = (c % 2 === 0) ? 0 : pathHeight;
                appendZigzagPoint(points, xLeft, pathHeight - yTop);
                appendZigzagPoint(points, xLeft, pathHeight - yBottom);
                if (c < columns) {
                    if (rows % 2 === 0) {
                        xNext = cellWidth * columns + margin - (c + 1) * cellWidth;
                    } else {
                        xNext = margin + (c + 1) * cellWidth;
                    }
                    appendZigzagPoint(points, xNext, pathHeight - yBottom);
                }
            }
        } else {
            var overhangX = margin;
            var overhangY = margin;
            var horizontalLeft = 0;
            var horizontalRight = pathWidth;
            var pitchX = cellWidth + gap;
            var pitchY = cellHeight + gap;
            var verticalTop = pathHeight;

            for (r = 0; r < rows; r++) {
                yTop = overhangY + r * pitchY;
                yBottom = yTop + cellHeight;
                appendZigzagPoint(points, horizontalLeft, pathHeight - yTop);
                appendZigzagPoint(points, horizontalRight, pathHeight - yTop);
                appendZigzagPoint(points, horizontalRight, pathHeight - yBottom);
                appendZigzagPoint(points, horizontalLeft, pathHeight - yBottom);
                if (r < rows - 1) {
                    yNext = yBottom + gap;
                    appendZigzagPoint(points, horizontalLeft, pathHeight - yNext);
                }
            }

            xLeft = overhangX;
            appendZigzagPoint(points, xLeft, 0);
            for (c = 0; c < columns; c++) {
                xLeft = overhangX + c * pitchX;
                xRight = xLeft + cellWidth;
                appendZigzagPoint(points, xLeft, verticalTop);
                appendZigzagPoint(points, xRight, verticalTop);
                appendZigzagPoint(points, xRight, 0);
                if (c < columns - 1) {
                    xNext = xRight + gap;
                    appendZigzagPoint(points, xNext, 0);
                }
            }
        }

        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        var centerX = (ab[0] + ab[2]) / 2;
        var centerY = (ab[1] + ab[3]) / 2;
        var left = centerX - pathWidth / 2;
        var bottom = centerY - pathHeight / 2;
        var translated = [];
        var i;
        for (i = 0; i < points.length; i++) {
            translated.push([left + points[i][0], bottom + points[i][1]]);
        }

        var path = doc.activeLayer.pathItems.add();
        path.setEntirePath(translated);
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = stroke;
        path.strokeColor = getCutPathColor(doc);
        path.name = 'Cut Path';
        return path;
    }

    if (app.documents.length === 0) {
        showLocalizedAlert('Hãy mở một tài liệu Illustrator trước khi chạy script.', 'Open an Illustrator document before running this script.');
        return;
    }

    var doc = app.activeDocument;
    var unit = getDocumentUnit(doc);
    var unitName = unit.name;
    var dialog = new Window('dialog', '');
    bindLocalized(dialog, 'Tạo Path', 'CutPathGenerator');
    dialog.preferredSize.width = 420;
    dialog.orientation = 'column';
    dialog.alignChildren = 'fill';
    dialog.spacing = 6;
    dialog.margins = 6;

    var languageRow = dialog.add('group');
    languageRow.orientation = 'row';
    addLocalized(languageRow, 'statictext', 'Ngôn ngữ:', 'Language:');
    var languageList = languageRow.add('dropdownlist', undefined, ['Tiếng Việt', 'English']);
    languageList.selection = uiLanguage === 'en' ? 1 : 0;
    languageList.onChange = function () {
        uiLanguage = languageList.selection.index === 1 ? 'en' : 'vi';
        updateLocalizedTexts();
        refreshModeLayout();
        savePreferences();
    };

    var modePanel = addLocalized(dialog, 'panel', 'Kiểu đường cắt', 'Cut type');
    modePanel.orientation = 'row';
    modePanel.margins = 6;
    modePanel.spacing = 4;
    var zigzagRadio = addLocalized(modePanel, 'radiobutton', 'Cắt thẳng', 'Straight cut');
    var connectedRadio = addLocalized(modePanel, 'radiobutton', 'Cắt tròn / oval', 'Circle / ellipse');
    zigzagRadio.preferredSize.width = 115;
    connectedRadio.preferredSize.width = 190;
    zigzagRadio.value = true;

    var contentHost = dialog.add('group');
    contentHost.orientation = 'stack';
    contentHost.alignChildren = 'fill';
    contentHost.alignment = ['fill', 'top'];

    var connectedPanel = addLocalized(contentHost, 'panel', 'Cắt tròn / oval', 'Circle / ellipse cut');
    connectedPanel.orientation = 'column';
    connectedPanel.alignChildren = 'fill';
    connectedPanel.margins = 6;
    connectedPanel.spacing = 4;

    var directionRow = connectedPanel.add('group');
    addLocalized(directionRow, 'statictext', 'Hướng:', 'Direction:').preferredSize.width = 100;
    var horizontalRadio = addLocalized(directionRow, 'radiobutton', 'Ngang', 'Horizontal');
    var verticalRadio = addLocalized(directionRow, 'radiobutton', 'Dọc', 'Vertical');
    horizontalRadio.preferredSize.width = 100;
    verticalRadio.preferredSize.width = 90;
    horizontalRadio.value = true;
    horizontalRadio.onClick = function () { verticalRadio.value = false; };
    verticalRadio.onClick = function () { horizontalRadio.value = false; };

    var shapeRow = connectedPanel.add('group');
    addLocalized(shapeRow, 'statictext', 'Hình:', 'Shape:').preferredSize.width = 100;
    var circleRadio = addLocalized(shapeRow, 'radiobutton', 'Tròn', 'Circle');
    var ellipseRadio = addLocalized(shapeRow, 'radiobutton', 'Ellipse', 'Ellipse');
    circleRadio.preferredSize.width = 85;
    ellipseRadio.preferredSize.width = 85;
    circleRadio.value = true;

    var connectedSizePanel = addLocalized(connectedPanel, 'panel', 'Kích thước (' + unitName + ')', 'Size (' + unitName + ')');
    connectedSizePanel.orientation = 'column';
    connectedSizePanel.alignChildren = 'fill';
    connectedSizePanel.margins = 6;
    var connectedWidth = addField(connectedSizePanel, 'Đường kính:', 30, 3, unitName);
    bindLocalized(connectedWidth._label, 'Đường kính:', 'Diameter:');
    var connectedHeight = addField(connectedSizePanel, 'Chiều cao:', 30, 3, unitName);
    bindLocalized(connectedHeight._label, 'Chiều cao:', 'Height:');
    connectedHeight._row.visible = false;

    var connectedCount = addField(connectedPanel, 'Số đường tròn:', 10, 0);
    bindLocalized(connectedCount._label, 'Số đường tròn:', 'Number of circles:');
    var connectedPaths = addField(connectedPanel, 'Số dãy:', 1, 0);
    bindLocalized(connectedPaths._label, 'Số dãy:', 'Rows:');
    var connectedArcGap = addField(connectedPanel, 'Khoảng cách cung:', 0, 3, unitName);
    bindLocalized(connectedArcGap._label, 'Khoảng cách cung:', 'Arc spacing:');
    var connectedGap = addField(connectedPanel, 'Khoảng cách dãy:', 2, 3, unitName);
    bindLocalized(connectedGap._label, 'Khoảng cách dãy:', 'Row spacing:');
    var connectedStroke = addField(connectedPanel, 'Độ dày nét:', 0.25, 3, unitName);
    bindLocalized(connectedStroke._label, 'Độ dày nét:', 'Stroke:');
    circleRadio.onClick = function () {
        ellipseRadio.value = false;
        bindLocalized(connectedWidth._label, 'Đường kính:', 'Diameter:');
        connectedHeight._row.visible = false;
    };
    ellipseRadio.onClick = function () {
        circleRadio.value = false;
        bindLocalized(connectedWidth._label, 'Chiều ngang:', 'Width:');
        connectedHeight._row.visible = true;
    };

    var zigzagPanel = addLocalized(contentHost, 'panel', 'Cắt thẳng', 'Straight cut');
    zigzagPanel.orientation = 'column';
    zigzagPanel.alignChildren = 'fill';
    zigzagPanel.margins = 6;
    zigzagPanel.spacing = 4;
    var zigzagWidth = addField(zigzagPanel, 'Chiều rộng:', 30, 3, unitName);
    bindLocalized(zigzagWidth._label, 'Chiều rộng:', 'Width:');
    var zigzagHeight = addField(zigzagPanel, 'Chiều cao:', 30, 3, unitName);
    bindLocalized(zigzagHeight._label, 'Chiều cao:', 'Height:');
    var zigzagColumns = addField(zigzagPanel, 'Số cột:', 6, 0);
    bindLocalized(zigzagColumns._label, 'Số cột:', 'Columns:');
    var zigzagRows = addField(zigzagPanel, 'Số hàng:', 6, 0);
    bindLocalized(zigzagRows._label, 'Số hàng:', 'Rows:');
    var zigzagGap = addField(zigzagPanel, 'Khoảng cách:', 0, 3, unitName);
    bindLocalized(zigzagGap._label, 'Khoảng cách:', 'Spacing:');
    var zigzagMargin = addField(zigzagPanel, 'Lề:', 2, 3, unitName);
    bindLocalized(zigzagMargin._label, 'Lề:', 'Margin:');
    var zigzagStroke = addField(zigzagPanel, 'Độ dày nét:', 0.25, 3, unitName);
    bindLocalized(zigzagStroke._label, 'Độ dày nét:', 'Stroke:');
    connectedPanel.alignment = ['fill', 'top'];
    zigzagPanel.alignment = ['fill', 'top'];
    connectedPanel.visible = false;
    zigzagPanel.visible = true;

    function savePreferences() {
        try {
            var folder = new Folder(Folder.userData.fsName + '/Custom_Path_Generator');
            if (!folder.exists && !folder.create()) return;
            var file = new File(folder.fsName + '/preferences.txt');
            file.encoding = 'UTF-8';
            if (!file.open('w')) return;
            var values = [
                'language=' + uiLanguage,
                'mode=' + (connectedRadio.value ? 'circle' : 'zigzag'),
                'direction=' + (verticalRadio.value ? 'vertical' : 'horizontal'),
                'shape=' + (ellipseRadio.value ? 'ellipse' : 'circle'),
                'circleWidth=' + connectedWidth.text,
                'circleHeight=' + connectedHeight.text,
                'arcCount=' + connectedCount.text,
                'pathCount=' + connectedPaths.text,
                'arcGap=' + connectedArcGap.text,
                'pathGap=' + connectedGap.text,
                'circleStroke=' + connectedStroke.text,
                'zigzagWidth=' + zigzagWidth.text,
                'zigzagHeight=' + zigzagHeight.text,
                'zigzagColumns=' + zigzagColumns.text,
                'zigzagRows=' + zigzagRows.text,
                'zigzagGap=' + zigzagGap.text,
                'zigzagMargin=' + zigzagMargin.text,
                'zigzagStroke=' + zigzagStroke.text
            ];
            file.write(values.join('\n'));
            file.close();
        } catch (e) {}
    }

    function restoreField(field, key) {
        if (typeof savedPreferences[key] !== 'undefined') field.text = savedPreferences[key];
    }

    function restorePreferences() {
        restoreField(connectedWidth, 'circleWidth');
        restoreField(connectedHeight, 'circleHeight');
        restoreField(connectedCount, 'arcCount');
        restoreField(connectedPaths, 'pathCount');
        restoreField(connectedArcGap, 'arcGap');
        restoreField(connectedGap, 'pathGap');
        restoreField(connectedStroke, 'circleStroke');
        restoreField(zigzagWidth, 'zigzagWidth');
        restoreField(zigzagHeight, 'zigzagHeight');
        restoreField(zigzagColumns, 'zigzagColumns');
        restoreField(zigzagRows, 'zigzagRows');
        restoreField(zigzagGap, 'zigzagGap');
        restoreField(zigzagMargin, 'zigzagMargin');
        restoreField(zigzagStroke, 'zigzagStroke');

        if (savedPreferences.direction === 'vertical') {
            verticalRadio.value = true;
            horizontalRadio.value = false;
        }
        if (savedPreferences.shape === 'ellipse') {
            ellipseRadio.value = true;
            circleRadio.value = false;
            bindLocalized(connectedWidth._label, 'Chiều ngang:', 'Width:');
            connectedHeight._row.visible = true;
        }
        if (savedPreferences.mode === 'circle') {
            connectedRadio.value = true;
            zigzagRadio.value = false;
            connectedPanel.visible = true;
            zigzagPanel.visible = false;
        }
    }

    dialog.onClose = function () { savePreferences(); };

    function refreshModeLayout() {
        dialog.layout.layout(true);
        dialog.layout.resize();
    }

    connectedRadio.onClick = function () {
        zigzagRadio.value = false;
        connectedPanel.visible = true;
        zigzagPanel.visible = false;
        refreshModeLayout();
    };
    zigzagRadio.onClick = function () {
        connectedRadio.value = false;
        connectedPanel.visible = false;
        zigzagPanel.visible = true;
        refreshModeLayout();
    };

    var buttons = dialog.add('group');
    buttons.alignment = 'right';
    buttons.spacing = 4;
    var cancelButton = addLocalized(buttons, 'button', 'Hủy', 'Cancel');
    cancelButton.name = 'cancel';
    cancelButton.onClick = function () {
        dialog.close(0);
    };
    var createButton = addLocalized(buttons, 'button', 'Tạo path', 'Create paths');
    createButton.name = 'ok';
    // Enter activates Create even when an edit field currently has focus.
    dialog.defaultElement = createButton;

    createButton.onClick = function () {
        var group;
        try {
            if (connectedRadio.value) {
                var connectedValues = {
                    width: number(connectedWidth.text),
                    height: number(connectedHeight.text),
                    count: number(connectedCount.text),
                    pathCount: number(connectedPaths.text),
                    pathGap: number(connectedGap.text),
                    arcGap: number(connectedArcGap.text),
                    stroke: number(connectedStroke.text),
                    circle: circleRadio.value,
                    vertical: verticalRadio.value
                };

                if (!positive(connectedValues.width) ||
                    (!connectedValues.circle && !positive(connectedValues.height))) {
                    showLocalizedAlert('Kích thước Circle/Ellipse phải lớn hơn 0.', 'Circle/Ellipse dimensions must be greater than zero.'); return;
                }
                if (!positiveInteger(connectedValues.count) ||
                    !positiveInteger(connectedValues.pathCount)) {
                    showLocalizedAlert('Số đường tròn và số dãy phải là số nguyên từ 1 trở lên.', 'Number of circles and rows must be integers of at least 1.'); return;
                }
                if (!nonNegative(connectedValues.pathGap) || !nonNegative(connectedValues.arcGap) || !positive(connectedValues.stroke)) {
                    showLocalizedAlert('Khoảng cách cung/dãy phải không âm và độ dày nét phải lớn hơn 0.', 'Arc and row spacing must be non-negative and stroke width must be greater than zero.'); return;
                }

                var cWidth = toPt(connectedValues.width, unitName);
                var cHeight = connectedValues.circle ? cWidth : toPt(connectedValues.height, unitName);
                var cGap = toPt(connectedValues.pathGap, unitName);
                var cArcGap = toPt(connectedValues.arcGap, unitName);
                var cStroke = toPt(connectedValues.stroke, unitName);
                if (!positive(cWidth) || !positive(cHeight) || !nonNegative(cGap) || !nonNegative(cArcGap) || !positive(cStroke)) {
                    showLocalizedAlert('Không thể xác định kích thước theo đơn vị document.', 'Could not resolve dimensions in the document units.'); return;
                }

                var cDepth = connectedValues.count > 1 ? Math.max(cHeight, cArcGap) : cHeight;
                var cAlong = connectedValues.count * cWidth +
                    Math.max(0, connectedValues.count - 1) * cArcGap;
                var cAcross = connectedValues.pathCount * cDepth +
                    (connectedValues.pathCount - 1) * cGap;
                var circleFit = checkWorkspaceFit(doc,
                    connectedValues.vertical ? cAcross : cAlong,
                    connectedValues.vertical ? cAlong : cAcross,
                    cStroke);
                if (!circleFit.fits) {
                    showWorkspaceOverflow(circleFit, unitName);
                    return;
                }

                connectedValues.width = cWidth;
                connectedValues.height = cHeight;
                connectedValues.pathGap = cGap;
                connectedValues.arcGap = cArcGap;
                connectedValues.stroke = cStroke;
                if (cArcGap > 0) {
                    group = createGapArcMode(doc, connectedValues);
                } else {
                    group = createConnectedMode(doc, connectedValues, 'pt');
                }
            } else {
                var zigzagValues = {
                    cellWidth: number(zigzagWidth.text),
                    cellHeight: number(zigzagHeight.text),
                    columns: number(zigzagColumns.text),
                    rows: number(zigzagRows.text),
                    gap: number(zigzagGap.text),
                    margin: number(zigzagMargin.text),
                    stroke: number(zigzagStroke.text)
                };

                if (!positive(zigzagValues.cellWidth) || !positive(zigzagValues.cellHeight)) {
                    showLocalizedAlert('Chiều rộng và chiều cao phải lớn hơn 0.', 'Width and height must be greater than zero.'); return;
                }
                if (!positiveInteger(zigzagValues.columns) || !positiveInteger(zigzagValues.rows)) {
                    showLocalizedAlert('Số cột và số hàng phải là số nguyên từ 1 trở lên.', 'Columns and rows must be integers of at least 1.'); return;
                }
                if (!nonNegative(zigzagValues.gap) || !nonNegative(zigzagValues.margin) ||
                    !positive(zigzagValues.stroke)) {
                    showLocalizedAlert('Khoảng cách và lề phải không âm; độ dày nét phải lớn hơn 0.', 'Spacing and margin must be non-negative; stroke width must be greater than zero.'); return;
                }

                var zWidth = toPt(zigzagValues.cellWidth, unitName);
                var zHeight = toPt(zigzagValues.cellHeight, unitName);
                var zGap = toPt(zigzagValues.gap, unitName);
                var zMargin = toPt(zigzagValues.margin, unitName);
                var zStroke = toPt(zigzagValues.stroke, unitName);
                if (!positive(zWidth) || !positive(zHeight) || !nonNegative(zGap) ||
                    !nonNegative(zMargin) || !positive(zStroke)) {
                    showLocalizedAlert('Không thể xác định kích thước theo đơn vị document.', 'Could not resolve dimensions in the document units.'); return;
                }

                var zPathWidth = zigzagValues.columns * zWidth +
                    Math.max(0, zigzagValues.columns - 1) * zGap + 2 * zMargin;
                var zPathHeight = zigzagValues.rows * zHeight +
                    Math.max(0, zigzagValues.rows - 1) * zGap + 2 * zMargin;
                var zigzagFit = checkWorkspaceFit(doc, zPathWidth, zPathHeight, zStroke);
                if (!zigzagFit.fits) {
                    showWorkspaceOverflow(zigzagFit, unitName);
                    return;
                }

                zigzagValues.cellWidth = zWidth;
                zigzagValues.cellHeight = zHeight;
                zigzagValues.gap = zGap;
                zigzagValues.margin = zMargin;
                zigzagValues.stroke = zStroke;
                group = createZigzagMode(doc, zigzagValues, 'pt');
            }

            doc.selection = null;
            group.selected = true;
            dialog.close(1);
        } catch (error) {
            showLocalizedAlert('Không thể tạo path: ' + error.message, 'Could not create paths: ' + error.message);
        }
    };

    restorePreferences();
    refreshModeLayout();
    dialog.show();
}());
