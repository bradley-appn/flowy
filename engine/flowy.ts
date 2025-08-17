// Converted to TypeScript by Jules

namespace appn.flowy {

    export interface Block {
        childwidth: number;
        parent: number;
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    export interface NameValue {
        name: string;
        value: string;
    }

    export interface Attribute {
        [key: string]: string;
    }

    export interface OutputBlock {
        id: number;
        parent: number;
        data: NameValue[];
        attr: Attribute[];
    }

    export interface FlowyOutput {
        html: string;
        blockarr: Block[];
        blocks: OutputBlock[];
    }

    export interface FlowyImportData {
        html: string;
        blockarr: Block[];
    }

    export type GrabCallback = (block: HTMLElement) => void;
    export type ReleaseCallback = () => void;
    export type SnappingCallback = (drag: HTMLElement, first: boolean, parent?: HTMLElement) => boolean;
    export type RearrangeCallback = (drag: HTMLElement, parent: Block) => boolean;

    export class Flowy {
        private canvas: HTMLElement;
        private grab: GrabCallback;
        private release: ReleaseCallback;
        private snapping: SnappingCallback;
        private rearrange: RearrangeCallback;
        private spacing_x: number;
        private spacing_y: number;

        private blocks: Block[] = [];
        private blockstemp: Block[] = [];
        private absx: number = 0;
        private absy: number = 0;
        private active: boolean = false;
        private paddingx: number;
        private paddingy: number;
        private offsetleft: number = 0;
        private rearrangevar: boolean = false;
        private drag: HTMLElement | null = null;
        private dragx: number = 0;
        private dragy: number = 0;
        private original: HTMLElement | null = null;
        private mouse_x: number = 0;
        private mouse_y: number = 0;
        private dragblock: boolean = false;
        private prevblock: number = 0;
        private el!: HTMLElement;

        constructor(canvas: HTMLElement, grab?: GrabCallback, release?: ReleaseCallback, snapping?: SnappingCallback, rearrange?: RearrangeCallback, spacing_x?: number, spacing_y?: number) {
            this.canvas = canvas;
            this.grab = grab || function () { };
            this.release = release || function () { };
            this.snapping = snapping || function () { return true; };
            this.rearrange = rearrange || function () { return false; };
            this.spacing_x = spacing_x || 20;
            this.spacing_y = spacing_y || 80;

            this.paddingx = this.spacing_x;
            this.paddingy = this.spacing_y;

            if (!Element.prototype.matches) {
                (Element.prototype as any).matches = (Element.prototype as any).msMatchesSelector || (Element.prototype as any).webkitMatchesSelector;
            }
            if (!Element.prototype.closest) {
                Element.prototype.closest = function (s: string) {
                    var el: Element | null = this;
                    do {
                        if (el.matches(s)) return el;
                        el = el.parentElement || el.parentNode as Element;
                    } while (el !== null && el.nodeType === 1);
                    return null;
                };
            }

            this.load();
        }

        private load(): void {
            let loaded: boolean = false;
            if (!loaded)
                loaded = true;
            else
                return;

            if (window.getComputedStyle(this.canvas).position == "absolute" || window.getComputedStyle(this.canvas).position == "fixed") {
                this.absx = this.canvas.getBoundingClientRect().left;
                this.absy = this.canvas.getBoundingClientRect().top;
            }

            this.el = document.createElement("DIV");
            this.el.classList.add('indicator');
            this.el.classList.add('invisible');
            this.canvas.appendChild(this.el);

            document.addEventListener("mousedown", this.beginDrag.bind(this));
            document.addEventListener("mousedown", this.touchblock.bind(this), false);
            document.addEventListener("touchstart", this.beginDrag.bind(this));
            document.addEventListener("touchstart", this.touchblock.bind(this), false);

            document.addEventListener("mouseup", this.touchblock.bind(this), false);
            document.addEventListener("mousemove", this.moveBlock.bind(this), false);
            document.addEventListener("touchmove", this.moveBlock.bind(this), false);

            document.addEventListener("mouseup", this.endDrag.bind(this), false);
            document.addEventListener("touchend", this.endDrag.bind(this), false);
        }

        public import(output: FlowyImportData): void {
            this.canvas.innerHTML = output.html;
            for (let a: number = 0; a < output.blockarr.length; a++) {
                this.blocks.push({
                    childwidth: parseFloat(output.blockarr[a].childwidth.toString()),
                    parent: parseFloat(output.blockarr[a].parent.toString()),
                    id: parseFloat(output.blockarr[a].id.toString()),
                    x: parseFloat(output.blockarr[a].x.toString()),
                    y: parseFloat(output.blockarr[a].y.toString()),
                    width: parseFloat(output.blockarr[a].width.toString()),
                    height: parseFloat(output.blockarr[a].height.toString())
                })
            }
            if (this.blocks.length > 1) {
                this.rearrangeMe();
                this.checkOffset();
            }
        }

        public output(): FlowyOutput | undefined {
            const html_ser: string = this.canvas.innerHTML;
            let json_data: FlowyOutput = {
                html: html_ser,
                blockarr: this.blocks,
                blocks: []
            };
            if (this.blocks.length > 0) {
                for (let i: number = 0; i < this.blocks.length; i++) {
                    json_data.blocks.push({
                        id: this.blocks[i].id,
                        parent: this.blocks[i].parent,
                        data: [],
                        attr: []
                    });
                    const blockParent: HTMLElement = document.querySelector(".blockid[value='" + this.blocks[i].id + "']").parentNode as HTMLElement;
                    blockParent.querySelectorAll("input").forEach((block: HTMLInputElement) => {
                        const json_name: string = block.getAttribute("name");
                        const json_value: string = block.value;
                        json_data.blocks[i].data.push({
                            name: json_name,
                            value: json_value
                        });
                    });
                    Array.prototype.slice.call(blockParent.attributes).forEach((attribute: Attr) => {
                        let jsonobj: Attribute = {};
                        jsonobj[attribute.name] = attribute.value;
                        json_data.blocks[i].attr.push(jsonobj);
                    });
                }
                return json_data;
            }
        }

        public deleteBlocks(): void {
            this.blocks = [];
            this.canvas.innerHTML = "<div class='indicator invisible'></div>";
        }

        public beginDrag(event: MouseEvent | TouchEvent): void {
            if (window.getComputedStyle(this.canvas).position == "absolute" || window.getComputedStyle(this.canvas).position == "fixed") {
                this.absx = this.canvas.getBoundingClientRect().left;
                this.absy = this.canvas.getBoundingClientRect().top;
            }
            if (event instanceof TouchEvent) {
                this.mouse_x = event.changedTouches[0].clientX;
                this.mouse_y = event.changedTouches[0].clientY;
            } else {
                this.mouse_x = event.clientX;
                this.mouse_y = event.clientY;
            }
            const target = event.target as HTMLElement;
            if (event instanceof MouseEvent && event.button !== 2 && target.closest(".create-flowy")) {
                this.original = target.closest(".create-flowy");
                if (!this.original) return;
                const newNode: HTMLElement = this.original.cloneNode(true) as HTMLElement;
                this.original.classList.add("dragnow");
                newNode.classList.add("block");
                newNode.classList.remove("create-flowy");
                let newId: number;
                if (this.blocks.length === 0) {
                    newId = 0;
                } else {
                    newId = Math.max(...this.blocks.map(a => a.id)) + 1;
                }
                newNode.innerHTML += `<input type='hidden' name='blockid' class='blockid' value='${newId}'>`;
                document.body.appendChild(newNode);
                this.drag = document.querySelector(`.blockid[value='${newId}']`)?.parentNode as HTMLElement;

                if (this.drag) {
                    this.blockGrabbed(target.closest(".create-flowy"));
                    this.drag.classList.add("dragging");
                    this.active = true;
                    this.dragx = this.mouse_x - (this.original.getBoundingClientRect().left);
                    this.dragy = this.mouse_y - (this.original.getBoundingClientRect().top);
                    this.drag.style.left = this.mouse_x - this.dragx + "px";
                    this.drag.style.top = this.mouse_y - this.dragy + "px";
                }
            }
        }

        public endDrag(event: MouseEvent | TouchEvent): void {
            if ((event instanceof MouseEvent && event.button !== 2) && (this.active || this.rearrangevar)) {
                this.dragblock = false;
                this.blockReleased();
                const indicator = document.querySelector(".indicator");
                if (indicator && !indicator.classList.contains("invisible")) {
                    indicator.classList.add("invisible");
                }
                if (this.active && this.original && this.drag) {
                    this.original.classList.remove("dragnow");
                    this.drag.classList.remove("dragging");
                }
                if (this.drag && parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value) === 0 && this.rearrangevar) {
                    this.firstBlock("rearrange")
                } else if (this.active && this.drag && this.blocks.length == 0 && (this.drag.getBoundingClientRect().top + window.scrollY) > (this.canvas.getBoundingClientRect().top + window.scrollY) && (this.drag.getBoundingClientRect().left + window.scrollX) > (this.canvas.getBoundingClientRect().left + window.scrollX)) {
                    this.firstBlock("drop");
                } else if (this.active && this.blocks.length == 0) {
                    this.removeSelection();
                } else if (this.active) {
                    const blocko: number[] = this.blocks.map(a => a.id);
                    for (let i: number = 0; i < this.blocks.length; i++) {
                        if (this.checkAttach(blocko[i])) {
                            this.active = false;
                            const parentNode = document.querySelector(".blockid[value='" + blocko[i] + "']");
                            if (this.drag && parentNode && this.blockSnap(this.drag, false, parentNode.parentNode as HTMLElement)) {
                                this.snap(this.drag, i, blocko);
                            } else {
                                this.active = false;
                                this.removeSelection();
                            }
                            break;
                        } else if (i == this.blocks.length - 1) {
                            this.active = false;
                            this.removeSelection();
                        }
                    }
                } else if (this.rearrangevar) {
                    const blocko: number[] = this.blocks.map(a => a.id);
                    for (let i: number = 0; i < this.blocks.length; i++) {
                        if (this.checkAttach(blocko[i])) {
                            this.active = false;
                            if (this.drag) {
                                this.drag.classList.remove("dragging");
                                this.snap(this.drag, i, blocko);
                            }
                            break;
                        } else if (i == this.blocks.length - 1) {
                            const parentBlock = this.blocks.find(id => id.id == blocko[i]);
                            if (this.drag && parentBlock && this.beforeDelete(this.drag, parentBlock)) {
                                this.active = false;
                                this.drag.classList.remove("dragging");
                                this.snap(this.drag, blocko.indexOf(this.prevblock), blocko);
                                break;
                            } else {
                                this.rearrangevar = false;
                                this.blockstemp = [];
                                this.active = false;
                                this.removeSelection();
                                break;
                            }
                        }
                    }
                }
            }
        }

        public moveBlock(event: MouseEvent | TouchEvent): void {
            if (event instanceof TouchEvent) {
                this.mouse_x = event.targetTouches[0].clientX;
                this.mouse_y = event.targetTouches[0].clientY;
            } else {
                this.mouse_x = event.clientX;
                this.mouse_y = event.clientY;
            }
            if (this.dragblock) {
                this.rearrangevar = true;
                this.drag.classList.add("dragging");
                const blockid: number = parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value);
                this.prevblock = this.blocks.filter(a => a.id == blockid)[0].parent;
                this.blockstemp.push(this.blocks.filter(a => a.id == blockid)[0]);
                this.blocks = this.blocks.filter(e => e.id != blockid);
                if (blockid != 0) {
                    document.querySelector(".arrowid[value='" + blockid + "']").parentNode.remove();
                }
                let layer: Block[] = this.blocks.filter(a => a.parent == blockid);
                let flag: boolean = false;
                let foundids: number[] = [];
                let allids: number[] = [];
                while (!flag) {
                    for (let i = 0; i < layer.length; i++) {
                        if (layer[i].id != blockid) {
                            this.blockstemp.push(this.blocks.filter(a => a.id == layer[i].id)[0]);
                            const blockParent: HTMLElement = document.querySelector(".blockid[value='" + layer[i].id + "']").parentNode as HTMLElement;
                            const arrowParent: HTMLElement = document.querySelector(".arrowid[value='" + layer[i].id + "']").parentNode as HTMLElement;
                            blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (this.drag.getBoundingClientRect().left + window.scrollX) + "px";
                            blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (this.drag.getBoundingClientRect().top + window.scrollY) + "px";
                            arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (this.drag.getBoundingClientRect().left + window.scrollX) + "px";
                            arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) - (this.drag.getBoundingClientRect().top + window.scrollY) + "px";
                            this.drag.appendChild(blockParent);
                            this.drag.appendChild(arrowParent);
                            foundids.push(layer[i].id);
                            allids.push(layer[i].id);
                        }
                    }
                    if (foundids.length == 0) {
                        flag = true;
                    } else {
                        layer = this.blocks.filter(a => foundids.includes(a.parent));
                        foundids = [];
                    }
                }
                for (let i = 0; i < this.blocks.filter(a => a.parent == blockid).length; i++) {
                    const blocknumber: Block = this.blocks.filter(a => a.parent == blockid)[i];
                    this.blocks = this.blocks.filter(e => e.id != blocknumber.id);
                }
                for (let i = 0; i < allids.length; i++) {
                    const blocknumber: number = allids[i];
                    this.blocks = this.blocks.filter(e => e.id != blocknumber);
                }
                if (this.blocks.length > 1) {
                    this.rearrangeMe();
                }
                this.dragblock = false;
            }
            if (this.active) {
                this.drag.style.left = this.mouse_x - this.dragx + "px";
                this.drag.style.top = this.mouse_y - this.dragy + "px";
            } else if (this.rearrangevar) {
                this.drag.style.left = this.mouse_x - this.dragx - (window.scrollX + this.absx) + this.canvas.scrollLeft + "px";
                this.drag.style.top = this.mouse_y - this.dragy - (window.scrollY + this.absy) + this.canvas.scrollTop + "px";
                this.blockstemp.filter(a => a.id == parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value))[0].x = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas.scrollLeft;
                this.blockstemp.filter(a => a.id == parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value))[0].y = (this.drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(this.drag).height) / 2) + this.canvas.scrollTop;
            }
            if (this.active || this.rearrangevar) {
                if (this.mouse_x > this.canvas.getBoundingClientRect().width + this.canvas.getBoundingClientRect().left - 10 && this.mouse_x < this.canvas.getBoundingClientRect().width + this.canvas.getBoundingClientRect().left + 10) {
                    this.canvas.scrollLeft += 10;
                } else if (this.mouse_x < this.canvas.getBoundingClientRect().left + 10 && this.mouse_x > this.canvas.getBoundingClientRect().left - 10) {
                    this.canvas.scrollLeft -= 10;
                } else if (this.mouse_y > this.canvas.getBoundingClientRect().height + this.canvas.getBoundingClientRect().top - 10 && this.mouse_y < this.canvas.getBoundingClientRect().height + this.canvas.getBoundingClientRect().top + 10) {
                    this.canvas.scrollTop += 10;
                } else if (this.mouse_y < this.canvas.getBoundingClientRect().top + 10 && this.mouse_y > this.canvas.getBoundingClientRect().top - 10) {
                    this.canvas.scrollLeft -= 10;
                }
                const xpos: number = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left;
                const ypos: number = (this.drag.getBoundingClientRect().top + window.scrollY) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top;
                const blocko: number[] = this.blocks.map(a => a.id);
                for (let i: number = 0; i < this.blocks.length; i++) {
                    if (this.checkAttach(blocko[i])) {
                        (document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode as HTMLElement).appendChild(document.querySelector(".indicator"));
                        (document.querySelector(".indicator") as HTMLElement).style.left = ((document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode as HTMLElement).offsetWidth / 2) - 5 + "px";
                        (document.querySelector(".indicator") as HTMLElement).style.top = (document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode as HTMLElement).offsetHeight + "px";
                        document.querySelector(".indicator").classList.remove("invisible");
                        break;
                    } else if (i == this.blocks.length - 1) {
                        if (!document.querySelector(".indicator").classList.contains("invisible")) {
                            document.querySelector(".indicator").classList.add("invisible");
                        }
                    }
                }
            }
        }

        private checkAttach(id: number): boolean {
            if (!this.drag) return false;
            const xpos: number = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left;
            const ypos: number = (this.drag.getBoundingClientRect().top + window.scrollY) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top;
            const block: Block = this.blocks.find(a => a.id == id);
            if (block && xpos >= block.x - (block.width / 2) - this.paddingx && xpos <= block.x + (block.width / 2) + this.paddingx && ypos >= block.y - (block.height / 2) && ypos <= block.y + block.height) {
                return true;
            } else {
                return false;
            }
        }

        private removeSelection(): void {
            const indicator = document.querySelector(".indicator");
            if (indicator) {
                this.canvas.appendChild(indicator);
            }
            if (this.drag && this.drag.parentNode) {
                this.drag.parentNode.removeChild(this.drag);
            }
        }

        private firstBlock(type: string): void {
            if (type == "drop") {
                this.blockSnap(this.drag, true, undefined);
                this.active = false;
                this.drag.style.top = (this.drag.getBoundingClientRect().top + window.scrollY) - (this.absy + window.scrollY) + this.canvas.scrollTop + "px";
                this.drag.style.left = (this.drag.getBoundingClientRect().left + window.scrollX) - (this.absx + window.scrollX) + this.canvas.scrollLeft + "px";
                this.canvas.appendChild(this.drag);
                this.blocks.push({
                    parent: -1,
                    childwidth: 0,
                    id: parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value),
                    x: (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left,
                    y: (this.drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(this.drag).height) / 2) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top,
                    width: parseInt(window.getComputedStyle(this.drag).width),
                    height: parseInt(window.getComputedStyle(this.drag).height)
                });
            } else if (type == "rearrange") {
                this.drag.classList.remove("dragging");
                this.rearrangevar = false;
                for (let w: number = 0; w < this.blockstemp.length; w++) {
                    if (this.blockstemp[w].id != parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value)) {
                        const blockParent: HTMLElement = document.querySelector(".blockid[value='" + this.blockstemp[w].id + "']").parentNode as HTMLElement;
                        const arrowParent: HTMLElement = document.querySelector(".arrowid[value='" + this.blockstemp[w].id + "']").parentNode as HTMLElement;
                        blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX) + this.canvas.scrollLeft - 1 - this.absx + "px";
                        blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY) + this.canvas.scrollTop - this.absy - 1 + "px";
                        arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX) + this.canvas.scrollLeft - this.absx - 1 + "px";
                        arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) + this.canvas.scrollTop - 1 - this.absy + "px";
                        this.canvas.appendChild(blockParent);
                        this.canvas.appendChild(arrowParent);
                        this.blockstemp[w].x = (blockParent.getBoundingClientRect().left + window.scrollX) + (blockParent.offsetWidth / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left - 1;
                        this.blockstemp[w].y = (blockParent.getBoundingClientRect().top + window.scrollY) + (blockParent.offsetHeight / 2) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top - 1;
                    }
                }
                this.blockstemp.find(a => a.id == 0).x = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left;
                this.blockstemp.find(a => a.id == 0).y = (this.drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(this.drag).height) / 2) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top;
                this.blocks = this.blocks.concat(this.blockstemp);
                this.blockstemp = [];
            }
        }

        private drawArrow(arrow: Block, x: number, y: number, id: number): void {
            const parentBlock = this.blocks.find(a => a.id == id);
            if (x < 0) {
                this.canvas.innerHTML += `<div class="arrowblock"><input type="hidden" class="arrowid" value="${(this.drag.querySelector(".blockid") as HTMLInputElement).value}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${parentBlock.x - arrow.x + 5} 0L${parentBlock.x - arrow.x + 5} ${this.paddingy / 2}L5 ${this.paddingy / 2}L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${y - 5}H10L5 ${y}L0 ${y - 5}Z" fill="#C5CCD0"/></svg></div>`;
                (document.querySelector(`.arrowid[value="${(this.drag.querySelector(".blockid") as HTMLInputElement).value}"]`).parentNode as HTMLElement).style.left = `${arrow.x - 5 - (this.absx + window.scrollX) + this.canvas.scrollLeft + this.canvas.getBoundingClientRect().left}px`;
            } else {
                this.canvas.innerHTML += `<div class="arrowblock"><input type="hidden" class="arrowid" value="${(this.drag.querySelector(".blockid") as HTMLInputElement).value}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${this.paddingy / 2}L${x} ${this.paddingy / 2}L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x - 5} ${y - 5}H${x + 5}L${x} ${y}L${x - 5} ${y - 5}Z" fill="#C5CCD0"/></svg></div>`;
                (document.querySelector(`.arrowid[value="${parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value)}"]`).parentNode as HTMLElement).style.left = `${parentBlock.x - 20 - (this.absx + window.scrollX) + this.canvas.scrollLeft + this.canvas.getBoundingClientRect().left}px`;
            }
            (document.querySelector(`.arrowid[value="${parseInt((this.drag.querySelector(".blockid") as HTMLInputElement).value)}"]`).parentNode as HTMLElement).style.top = `${parentBlock.y + (parentBlock.height / 2) + this.canvas.getBoundingClientRect().top - this.absy}px`;
        }

        private updateArrow(arrow: Block, x: number, y: number, children: Block): void {
            const parentBlock = this.blocks.find(id => id.id == children.parent);
            if (x < 0) {
                (document.querySelector(`.arrowid[value="${children.id}"]`).parentNode as HTMLElement).style.left = `${arrow.x - 5 - (this.absx + window.scrollX) + this.canvas.getBoundingClientRect().left}px`;
                (document.querySelector(`.arrowid[value="${children.id}"]`).parentNode as HTMLElement).innerHTML = `<input type="hidden" class="arrowid" value="${children.id}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${parentBlock.x - arrow.x + 5} 0L${parentBlock.x - arrow.x + 5} ${this.paddingy / 2}L5 ${this.paddingy / 2}L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${y - 5}H10L5 ${y}L0 ${y - 5}Z" fill="#C5CCD0"/></svg>`;
            } else {
                (document.querySelector(`.arrowid[value="${children.id}"]`).parentNode as HTMLElement).style.left = `${parentBlock.x - 20 - (this.absx + window.scrollX) + this.canvas.getBoundingClientRect().left}px`;
                (document.querySelector(`.arrowid[value="${children.id}"]`).parentNode as HTMLElement).innerHTML = `<input type="hidden" class="arrowid" value="${children.id}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${this.paddingy / 2}L${x} ${this.paddingy / 2}L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x - 5} ${y - 5}H${x + 5}L${x} ${y}L${x - 5} ${y - 5}Z" fill="#C5CCD0"/></svg>`;
            }
        }

        private snap(drag: HTMLElement, i: number, blocko: number[]): void {
            if (!this.rearrangevar) {
                this.canvas.appendChild(drag);
            }
            let totalwidth: number = 0;
            let totalremove: number = 0;
            const parentBlock = this.blocks.find(a => a.id == blocko[i]);

            for (let w = 0; w < this.blocks.filter(id => id.parent == blocko[i]).length; w++) {
                const children: Block = this.blocks.filter(id => id.parent == blocko[i])[w];
                if (children.childwidth > children.width) {
                    totalwidth += children.childwidth + this.paddingx;
                } else {
                    totalwidth += children.width + this.paddingx;
                }
            }
            totalwidth += parseInt(window.getComputedStyle(drag).width);
            for (let w = 0; w < this.blocks.filter(id => id.parent == blocko[i]).length; w++) {
                const children: Block = this.blocks.filter(id => id.parent == blocko[i])[w];
                if (children.childwidth > children.width) {
                    (document.querySelector(".blockid[value='" + children.id + "']").parentNode as HTMLElement).style.left = `${parentBlock.x - (totalwidth / 2) + totalremove + (children.childwidth / 2) - (children.width / 2)}px`;
                    children.x = parentBlock.x - (totalwidth / 2) + totalremove + (children.childwidth / 2);
                    totalremove += children.childwidth + this.paddingx;
                } else {
                    (document.querySelector(".blockid[value='" + children.id + "']").parentNode as HTMLElement).style.left = `${parentBlock.x - (totalwidth / 2) + totalremove}px`;
                    children.x = parentBlock.x - (totalwidth / 2) + totalremove + (children.width / 2);
                    totalremove += children.width + this.paddingx;
                }
            }
            drag.style.left = `${parentBlock.x - (totalwidth / 2) + totalremove - (window.scrollX + this.absx) + this.canvas.scrollLeft + this.canvas.getBoundingClientRect().left}px`;
            drag.style.top = `${parentBlock.y + (parentBlock.height / 2) + this.paddingy - (window.scrollY + this.absy) + this.canvas.getBoundingClientRect().top}px`;

            if (this.rearrangevar) {
                const draggedBlock = this.blockstemp.find(a => a.id == parseInt((drag.querySelector(".blockid") as HTMLInputElement).value));
                draggedBlock.x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left;
                draggedBlock.y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top;
                draggedBlock.parent = blocko[i];
                for (let w = 0; w < this.blockstemp.length; w++) {
                    if (this.blockstemp[w].id != parseInt((drag.querySelector(".blockid") as HTMLInputElement).value)) {
                        const blockParent: HTMLElement = document.querySelector(".blockid[value='" + this.blockstemp[w].id + "']").parentNode as HTMLElement;
                        const arrowParent: HTMLElement = document.querySelector(".arrowid[value='" + this.blockstemp[w].id + "']").parentNode as HTMLElement;
                        blockParent.style.left = `${(blockParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + this.canvas.getBoundingClientRect().left) + this.canvas.scrollLeft}px`;
                        blockParent.style.top = `${(blockParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + this.canvas.getBoundingClientRect().top) + this.canvas.scrollTop}px`;
                        arrowParent.style.left = `${(arrowParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + this.canvas.getBoundingClientRect().left) + this.canvas.scrollLeft + 20}px`;
                        arrowParent.style.top = `${(arrowParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + this.canvas.getBoundingClientRect().top) + this.canvas.scrollTop}px`;
                        this.canvas.appendChild(blockParent);
                        this.canvas.appendChild(arrowParent);

                        this.blockstemp[w].x = (blockParent.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(blockParent).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left;
                        this.blockstemp[w].y = (blockParent.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(blockParent).height) / 2) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top;
                    }
                }
                this.blocks = this.blocks.concat(this.blockstemp);
                this.blockstemp = [];
            } else {
                this.blocks.push({
                    childwidth: 0,
                    parent: blocko[i],
                    id: parseInt((drag.querySelector(".blockid") as HTMLInputElement).value),
                    x: (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + this.canvas.scrollLeft - this.canvas.getBoundingClientRect().left,
                    y: (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + this.canvas.scrollTop - this.canvas.getBoundingClientRect().top,
                    width: parseInt(window.getComputedStyle(drag).width),
                    height: parseInt(window.getComputedStyle(drag).height)
                });
            }

            const arrowblock: Block = this.blocks.find(a => a.id == parseInt((drag.querySelector(".blockid") as HTMLInputElement).value));
            const arrowx: number = arrowblock.x - parentBlock.x + 20;
            const arrowy: number = this.paddingy;
            this.drawArrow(arrowblock, arrowx, arrowy, blocko[i]);

            if (parentBlock.parent != -1) {
                let flag: boolean = false;
                let idval: number = blocko[i];
                while (!flag) {
                    const currentParent = this.blocks.find(a => a.id == idval);
                    if (currentParent.parent == -1) {
                        flag = true;
                    } else {
                        let zwidth: number = 0;
                        const childrenOfParent = this.blocks.filter(id => id.parent == idval);
                        for (let w = 0; w < childrenOfParent.length; w++) {
                            const children: Block = childrenOfParent[w];
                            if (children.childwidth > children.width) {
                                if (w == childrenOfParent.length - 1) {
                                    zwidth += children.childwidth;
                                } else {
                                    zwidth += children.childwidth + this.paddingx;
                                }
                            } else {
                                if (w == childrenOfParent.length - 1) {
                                    zwidth += children.width;
                                } else {
                                    zwidth += children.width + this.paddingx;
                                }
                            }
                        }
                        currentParent.childwidth = zwidth;
                        idval = currentParent.parent;
                    }
                }
                this.blocks.find(id => id.id == idval).childwidth = totalwidth;
            }
            if (this.rearrangevar) {
                this.rearrangevar = false;
                drag.classList.remove("dragging");
            }
            this.rearrangeMe();
            this.checkOffset();
        }

        private touchblock(event: MouseEvent | TouchEvent): void {
            this.dragblock = false;
            const target = event.target as HTMLElement;
            if (this.hasParentClass(target, "block")) {
                const theblock: HTMLElement | null = target.closest(".block");
                if (theblock) {
                    if (event instanceof TouchEvent) {
                        this.mouse_x = event.targetTouches[0].clientX;
                        this.mouse_y = event.targetTouches[0].clientY;
                    } else {
                        this.mouse_x = event.clientX;
                        this.mouse_y = event.clientY;
                    }
                    if (event.type !== "mouseup" && this.hasParentClass(target, "block")) {
                        if (event instanceof MouseEvent && event.button !== 2) {
                            if (!this.active && !this.rearrangevar) {
                                this.dragblock = true;
                                this.drag = theblock;
                                this.dragx = this.mouse_x - (this.drag.getBoundingClientRect().left + window.scrollX);
                                this.dragy = this.mouse_y - (this.drag.getBoundingClientRect().top + window.scrollY);
                            }
                        }
                    }
                }
            }
        }

        private hasParentClass(element: HTMLElement, classname: string): boolean {
            if (element.className) {
                if (element.className.split(' ').indexOf(classname) >= 0) return true;
            }
            return element.parentNode && this.hasParentClass(element.parentNode as HTMLElement, classname);
        }

        private checkOffset(): void {
            const offsetleft: number[] = this.blocks.map(a => a.x);
            const widths: number[] = this.blocks.map(a => a.width);
            const mathmin: number[] = offsetleft.map((item, index) => item - (widths[index] / 2));
            this.offsetleft = Math.min(...mathmin);
            if (this.offsetleft < (this.canvas.getBoundingClientRect().left + window.scrollX - this.absx)) {
                const blocko: number[] = this.blocks.map(a => a.id);
                for (let w = 0; w < this.blocks.length; w++) {
                    const block = this.blocks[w];
                    (document.querySelector(`.blockid[value='${block.id}']`).parentNode as HTMLElement).style.left = `${block.x - (block.width / 2) - this.offsetleft + this.canvas.getBoundingClientRect().left - this.absx + 20}px`;
                    if (block.parent != -1) {
                        const arrowblock: Block = block;
                        const parentBlock = this.blocks.find(a => a.id == block.parent);
                        const arrowx: number = arrowblock.x - parentBlock.x;
                        if (arrowx < 0) {
                            (document.querySelector(`.arrowid[value='${block.id}']`).parentNode as HTMLElement).style.left = `${arrowblock.x - this.offsetleft + 20 - 5 + this.canvas.getBoundingClientRect().left - this.absx}px`;
                        } else {
                            (document.querySelector(`.arrowid[value='${block.id}']`).parentNode as HTMLElement).style.left = `${parentBlock.x - 20 - this.offsetleft + this.canvas.getBoundingClientRect().left - this.absx + 20}px`;
                        }
                    }
                }
                for (let w = 0; w < this.blocks.length; w++) {
                    const block = this.blocks[w];
                    const blockEl = document.querySelector(`.blockid[value='${block.id}']`).parentNode as HTMLElement;
                    block.x = (blockEl.getBoundingClientRect().left + window.scrollX) + (this.canvas.scrollLeft) + (parseInt(window.getComputedStyle(blockEl).width) / 2) - 20 - this.canvas.getBoundingClientRect().left;
                }
            }
        }

        private rearrangeMe(): void {
            const result: number[] = this.blocks.map(a => a.parent);
            for (let z = 0; z < result.length; z++) {
                if (result[z] == -1) {
                    continue;
                }
                let totalwidth: number = 0;
                let totalremove: number = 0;
                const parentBlock = this.blocks.find(a => a.id == result[z]);
                const children = this.blocks.filter(id => id.parent == result[z]);

                for (let w = 0; w < children.length; w++) {
                    const child = children[w];
                    if (this.blocks.filter(id => id.parent == child.id).length == 0) {
                        child.childwidth = 0;
                    }
                    if (child.childwidth > child.width) {
                        if (w == children.length - 1) {
                            totalwidth += child.childwidth;
                        } else {
                            totalwidth += child.childwidth + this.paddingx;
                        }
                    } else {
                        if (w == children.length - 1) {
                            totalwidth += child.width;
                        } else {
                            totalwidth += child.width + this.paddingx;
                        }
                    }
                }
                if (result[z] != -1) {
                    parentBlock.childwidth = totalwidth;
                }
                for (let w = 0; w < children.length; w++) {
                    const child = children[w];
                    const r_block: HTMLElement = document.querySelector(".blockid[value='" + child.id + "']").parentNode as HTMLElement;
                    r_block.style.top = `${parentBlock.y + this.paddingy + this.canvas.getBoundingClientRect().top - this.absy}px`;
                    parentBlock.y = parentBlock.y + this.paddingy;
                    if (child.childwidth > child.width) {
                        r_block.style.left = `${parentBlock.x - (totalwidth / 2) + totalremove + (child.childwidth / 2) - (child.width / 2) - (this.absx + window.scrollX) + this.canvas.getBoundingClientRect().left}px`;
                        child.x = parentBlock.x - (totalwidth / 2) + totalremove + (child.childwidth / 2);
                        totalremove += child.childwidth + this.paddingx;
                    } else {
                        r_block.style.left = `${parentBlock.x - (totalwidth / 2) + totalremove - (this.absx + window.scrollX) + this.canvas.getBoundingClientRect().left}px`;
                        child.x = parentBlock.x - (totalwidth / 2) + totalremove + (child.width / 2);
                        totalremove += child.width + this.paddingx;
                    }

                    const arrowblock: Block = child;
                    const arrowx: number = arrowblock.x - parentBlock.x + 20;
                    const arrowy: number = this.paddingy;
                    this.updateArrow(arrowblock, arrowx, arrowy, child);
                }
            }
        }

        private blockGrabbed(block: HTMLElement): void {
            this.grab(block);
        }

        private blockReleased(): void {
            this.release();
        }

        private blockSnap(drag: HTMLElement, first: boolean, parent?: HTMLElement): boolean {
            return this.snapping(drag, first, parent);
        }

        private beforeDelete(drag: HTMLElement, parent: Block): boolean {
            return this.rearrange(drag, parent);
        }
    }

    export function create(canvas: HTMLElement, grab?: GrabCallback, release?: ReleaseCallback, snapping?: SnappingCallback, rearrange?: RearrangeCallback, spacing_x?: number, spacing_y?: number): Flowy {
        return new Flowy(canvas, grab, release, snapping, rearrange, spacing_x, spacing_y);
    }
}
