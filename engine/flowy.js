"use strict";
var appn;
(function (appn) {
    var sync;
    (function (sync) {
        var flowy;
        (function (flowy) {
            function init(canvas, grab, release, snapping, rearrange, spacing_x = 20, spacing_y = 80) {
                if (!grab) {
                    grab = () => { };
                }
                if (!release) {
                    release = () => { };
                }
                if (!snapping) {
                    snapping = () => true;
                }
                if (!rearrange) {
                    rearrange = () => false;
                }
                let loaded = false;
                if (loaded)
                    return;
                loaded = true;
                let blocks = [];
                let blockstemp = [];
                const canvas_div = canvas;
                let absx = 0;
                let absy = 0;
                if (window.getComputedStyle(canvas_div).position === "absolute" || window.getComputedStyle(canvas_div).position === "fixed") {
                    absx = canvas_div.getBoundingClientRect().left;
                    absy = canvas_div.getBoundingClientRect().top;
                }
                let active = false;
                const paddingx = spacing_x;
                const paddingy = spacing_y;
                let offsetleft = 0;
                let rearrange_active = false;
                let drag, dragx, dragy, original;
                let mouse_x, mouse_y;
                let dragblock = false;
                let prevblock = 0;
                const el = document.createElement("DIV");
                el.classList.add('indicator');
                el.classList.add('invisible');
                canvas_div.appendChild(el);
                flowy.import = (output) => {
                    canvas_div.innerHTML = output.html;
                    blocks = output.blockarr;
                    if (blocks.length > 1) {
                        rearrangeMe();
                        checkOffset();
                    }
                };
                flowy.output = () => {
                    const html_ser = canvas_div.innerHTML;
                    const json_data = {
                        html: html_ser,
                        blockarr: blocks,
                        blocks: []
                    };
                    if (blocks.length > 0) {
                        for (let i = 0; i < blocks.length; i++) {
                            const blockParent = document.querySelector(`.blockid[value='${blocks[i].id}']`).parentNode;
                            const dataArr = [];
                            blockParent.querySelectorAll("input").forEach((block) => {
                                const json_name = block.getAttribute("name");
                                const json_value = block.value;
                                dataArr.push({
                                    name: json_name,
                                    value: json_value
                                });
                            });
                            const attrObj = {};
                            Array.prototype.slice.call(blockParent.attributes).forEach((attribute) => {
                                attrObj[attribute.name] = attribute.value;
                            });
                            json_data.blocks.push({
                                id: blocks[i].id,
                                parent: blocks[i].parent,
                                data: dataArr,
                                attr: attrObj
                            });
                        }
                        return json_data;
                    }
                };
                flowy.deleteBlocks = () => {
                    blocks = [];
                    canvas_div.innerHTML = "<div class='indicator invisible'></div>";
                };
                flowy.beginDrag = (event) => {
                    if (window.getComputedStyle(canvas_div).position === "absolute" || window.getComputedStyle(canvas_div).position === "fixed") {
                        absx = canvas_div.getBoundingClientRect().left;
                        absy = canvas_div.getBoundingClientRect().top;
                    }
                    if (event instanceof TouchEvent) {
                        mouse_x = event.changedTouches[0].clientX;
                        mouse_y = event.changedTouches[0].clientY;
                    }
                    else {
                        mouse_x = event.clientX;
                        mouse_y = event.clientY;
                    }
                    if (event.which != 3 && event.target.closest(".create-flowy")) {
                        original = event.target.closest(".create-flowy");
                        const newNode = original.cloneNode(true);
                        original.classList.add("dragnow");
                        newNode.classList.add("block");
                        newNode.classList.remove("create-flowy");
                        if (blocks.length === 0) {
                            newNode.innerHTML += `<input type='hidden' name='blockid' class='blockid' value='${blocks.length}'>`;
                            document.body.appendChild(newNode);
                            drag = document.querySelector(`.blockid[value='${blocks.length}']`).parentNode;
                        }
                        else {
                            const newId = Math.max(...blocks.map(a => a.id)) + 1;
                            newNode.innerHTML += `<input type='hidden' name='blockid' class='blockid' value='${newId}'>`;
                            document.body.appendChild(newNode);
                            drag = document.querySelector(`.blockid[value='${newId}']`).parentNode;
                        }
                        blockGrabbed(original);
                        drag.classList.add("dragging");
                        active = true;
                        dragx = mouse_x - original.getBoundingClientRect().left;
                        dragy = mouse_y - original.getBoundingClientRect().top;
                        drag.style.left = `${mouse_x - dragx}px`;
                        drag.style.top = `${mouse_y - dragy}px`;
                    }
                };
                flowy.endDrag = (event) => {
                    if (event.which != 3 && (active || rearrange_active)) {
                        dragblock = false;
                        blockReleased();
                        if (!document.querySelector(".indicator").classList.contains("invisible")) {
                            document.querySelector(".indicator").classList.add("invisible");
                        }
                        if (active) {
                            original.classList.remove("dragnow");
                            drag.classList.remove("dragging");
                        }
                        if (parseInt(drag.querySelector(".blockid").getAttribute("value")) === 0 && rearrange_active) {
                            firstBlock("rearrange");
                        }
                        else if (active && blocks.length == 0 && (drag.getBoundingClientRect().top + window.scrollY) > (canvas_div.getBoundingClientRect().top + window.scrollY) && (drag.getBoundingClientRect().left + window.scrollX) > (canvas_div.getBoundingClientRect().left + window.scrollX)) {
                            firstBlock("drop");
                        }
                        else if (active && blocks.length == 0) {
                            removeSelection();
                        }
                        else if (active) {
                            const blocko = blocks.map(a => a.id);
                            for (let i = 0; i < blocks.length; i++) {
                                if (checkAttach(blocko[i])) {
                                    active = false;
                                    if (snapping(drag, false, document.querySelector(`.blockid[value='${blocko[i]}']`).parentNode)) {
                                        snap(drag, i, blocko);
                                    }
                                    else {
                                        active = false;
                                        removeSelection();
                                    }
                                    break;
                                }
                                else if (i == blocks.length - 1) {
                                    active = false;
                                    removeSelection();
                                }
                            }
                        }
                        else if (rearrange_active) {
                            const blocko = blocks.map(a => a.id);
                            for (let i = 0; i < blocks.length; i++) {
                                if (checkAttach(blocko[i])) {
                                    active = false;
                                    drag.classList.remove("dragging");
                                    snap(drag, i, blocko);
                                    break;
                                }
                                else if (i == blocks.length - 1) {
                                    if (rearrange(drag, blocks.filter(id => id.id == blocko[i])[0])) {
                                        active = false;
                                        drag.classList.remove("dragging");
                                        snap(drag, blocko.indexOf(prevblock), blocko);
                                        break;
                                    }
                                    else {
                                        rearrange_active = false;
                                        blockstemp = [];
                                        active = false;
                                        removeSelection();
                                        break;
                                    }
                                }
                            }
                        }
                    }
                };
                function blockGrabbed(block) { }
                function blockReleased() { }
                function firstBlock(mode) { }
                function removeSelection() { }
                function checkAttach(id) { return false; }
                function snap(drag, idx, blocko) { }
                function rearrangeMe() { }
                function checkOffset() { }
                document.addEventListener("mousedown", flowy.beginDrag);
                document.addEventListener("touchstart", flowy.beginDrag);
                document.addEventListener("mouseup", flowy.endDrag, false);
                document.addEventListener("touchend", flowy.endDrag, false);
            }
            flowy.init = init;
        })(flowy = sync.flowy || (sync.flowy = {}));
    })(sync = appn.sync || (appn.sync = {}));
})(appn || (appn = {}));
//# sourceMappingURL=flowy.js.map