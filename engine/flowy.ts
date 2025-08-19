namespace appn.sync.flowy {

    //==================================================================================================================
    // Polyfills
    //------------------------------------------------------------------------------------------------------------------
    // These polyfills are intended to patch the global Element.prototype for compatibility with older browsers.
    // They are placed within the namespace to keep the code organized but will affect the global scope as intended.
    //==================================================================================================================

    interface Element {
        msMatchesSelector?(selectors: string): boolean;
        webkitMatchesSelector?(selectors: string): boolean;
    }

    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }

    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s: string): Element | null {
            let el: Element | null = this;
            if (!document.documentElement.contains(el)) {
                return null;
            }
            do {
                if (el.matches(s)) {
                    return el;
                }
                el = el.parentElement || (el.parentNode as Element);
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }

    //==================================================================================================================
    // Interfaces & Type Definitions
    //==================================================================================================================

    /** Represents a single block in the flow chart. */
    export interface IFlowyBlock {
        parent: number;
        childwidth: number;
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    /** Defines the structure for data used to import a flowchart. */
    export interface IFlowyImport {
        html: string;
        blockarr: IFlowyBlock[];
    }

    /** Represents a name-value pair from an input field within a block. */
    interface IOutputData {
        name: string;
        value: string;
    }

    /** Represents a key-value pair for an element's attribute. */
    interface IOutputAttribute {
        [key: string]: string;
    }

    /** Detailed representation of a block for export, including its data and attributes. */
    interface IOutputBlock {
        id: number;
        parent: number;
        data: IOutputData[];
        attr: IOutputAttribute[];
    }

    /** Defines the complete structure of the exported flowchart data. */
    export interface IFlowyOutput {
        html: string;
        blockarr: IFlowyBlock[];
        blocks: IOutputBlock[];
    }
    
    //==================================================================================================================
    // Callback Signatures
    //==================================================================================================================

    export type GrabCallback = (block: Element) => void;
    export type ReleaseCallback = () => void;
    export type SnappingCallback = (drag: HTMLElement, isFirst: boolean, parent?: HTMLElement) => boolean;
    export type RearrangeCallback = (drag: HTMLElement, parent: IFlowyBlock) => boolean;

    //==================================================================================================================
    // Main Flowy Controller
    //==================================================================================================================

    /**
     * Initializes the flowy library on a given canvas element.
     * @param canvas The container element for the flowchart.
     * @param grab A callback function executed when a block is grabbed.
     * @param release A callback function executed when a block is released.
     * @param snapping A callback function to determine if a block can snap to a parent.
     * @param rearrange A callback function to determine if a block can be detached.
     * @param spacing_x The horizontal spacing between blocks.
     * @param spacing_y The vertical spacing between blocks.
     */
    export function init(
        canvas: HTMLElement,
        grab?: GrabCallback,
        release?: ReleaseCallback,
        snapping?: SnappingCallback,
        rearrangeCb?: RearrangeCallback,
        spacing_x?: number,
        spacing_y?: number
    ): FlowyApi {

        // Set default values for optional callbacks and parameters
        const onGrab: GrabCallback = grab || (() => {});
        const onRelease: ReleaseCallback = release || (() => {});
        const onSnapping: SnappingCallback = snapping || (() => true);
        const onRearrange: RearrangeCallback = rearrangeCb || (() => false);
        const padding_x: number = spacing_x || 20;
        const padding_y: number = spacing_y || 80;

        let loaded: boolean = false;
        let blocks: IFlowyBlock[] = [];
        let blockstemp: IFlowyBlock[] = [];
        const canvas_div: HTMLElement = canvas;
        let absx: number = 0;
        let absy: number = 0;
        let active: boolean = false;
        let offsetleft: number = 0;
        let rearrange: boolean = false;
        let drag: HTMLElement | undefined;
        let dragx: number | undefined;
        let dragy: number | undefined;
        let original: Element | undefined;
        let mouse_x: number = 0;
        let mouse_y: number = 0;
        let dragblock: boolean = false;
        let prevblock: number = 0;

        /** The public API object that will be returned upon initialization. */
        const api: FlowyApi = {
            import: (output: IFlowyImport): void => {
                canvas_div.innerHTML = output.html;
                blocks = output.blockarr.map(b => ({
                    childwidth: parseFloat(b.childwidth as any),
                    parent: parseFloat(b.parent as any),
                    id: parseFloat(b.id as any),
                    x: parseFloat(b.x as any),
                    y: parseFloat(b.y as any),
                    width: parseFloat(b.width as any),
                    height: parseFloat(b.height as any)
                }));
                if (blocks.length > 1) {
                    rearrangeMe();
                    checkOffset();
                }
            },
            output: (): IFlowyOutput | undefined => {
                const html_ser: string = canvas_div.innerHTML;
                const json_data: IFlowyOutput = {
                    html: html_ser,
                    blockarr: blocks,
                    blocks: []
                };
                if (blocks.length > 0) {
                    json_data.blocks = blocks.map((blockItem) => {
                        const outputBlock: IOutputBlock = {
                            id: blockItem.id,
                            parent: blockItem.parent,
                            data: [],
                            attr: []
                        };
                        const blockParent = canvas_div.querySelector<HTMLElement>(`.blockid[value='${blockItem.id}']`)?.parentNode as HTMLElement;
                        if (blockParent) {
                            blockParent.querySelectorAll<HTMLInputElement>("input").forEach(input => {
                                const name = input.getAttribute("name");
                                const value = input.value;
                                if (name) {
                                    outputBlock.data.push({ name, value });
                                }
                            });
                            Array.from(blockParent.attributes).forEach(attribute => {
                                outputBlock.attr.push({ [attribute.name]: attribute.value });
                            });
                        }
                        return outputBlock;
                    });
                    return json_data;
                }
            },
            deleteBlocks: (): void => {
                blocks = [];
                canvas_div.innerHTML = "<div class='indicator invisible'></div>";
            },
        };

        const load = (): void => {
            if (loaded) return;
            loaded = true;

            const computedStyle = window.getComputedStyle(canvas_div);
            if (computedStyle.position === "absolute" || computedStyle.position === "fixed") {
                const rect = canvas_div.getBoundingClientRect();
                absx = rect.left;
                absy = rect.top;
            }

            const el = document.createElement("div");
            el.classList.add('indicator', 'invisible');
            canvas_div.appendChild(el);

            document.addEventListener("mousedown", beginDrag);
            document.addEventListener("mousedown", touchblock);
            document.addEventListener("touchstart", beginDrag);
            document.addEventListener("touchstart", touchblock);

            document.addEventListener("mouseup", endDrag);
            document.addEventListener("touchend", endDrag);
            document.addEventListener("mousemove", moveBlock);
            document.addEventListener("touchmove", moveBlock);
        };
        
        const beginDrag = (event: MouseEvent | TouchEvent): void => {
            const computedStyle = window.getComputedStyle(canvas_div);
            if (computedStyle.position === "absolute" || computedStyle.position === "fixed") {
                const rect = canvas_div.getBoundingClientRect();
                absx = rect.left;
                absy = rect.top;
            }

            if ('targetTouches' in event) {
                mouse_x = event.targetTouches[0].clientX;
                mouse_y = event.targetTouches[0].clientY;
            } else {
                mouse_x = event.clientX;
                mouse_y = event.clientY;
            }

            const target = event.target as Element;
            if ((event as MouseEvent).which !== 3 && target.closest(".create-flowy")) {
                original = target.closest(".create-flowy")!;
                const newNode = original.cloneNode(true) as HTMLElement;
                original.classList.add("dragnow");
                newNode.classList.add("block");
                newNode.classList.remove("create-flowy");

                const maxId = blocks.length === 0 ? -1 : Math.max(...blocks.map(a => a.id));
                const newId = maxId + 1;

                newNode.innerHTML += `<input type='hidden' name='blockid' class='blockid' value='${newId}'>`;
                document.body.appendChild(newNode);
                drag = document.querySelector<HTMLInputElement>(`.blockid[value='${newId}']`)!.parentNode as HTMLElement;

                onGrab(original);
                drag.classList.add("dragging");
                active = true;
                const originalRect = original.getBoundingClientRect();
                dragx = mouse_x - originalRect.left;
                dragy = mouse_y - originalRect.top;
                drag.style.left = `${mouse_x - dragx}px`;
                drag.style.top = `${mouse_y - dragy}px`;
            }
        };

        const endDrag = (event: MouseEvent | TouchEvent): void => {
            if ((event as MouseEvent).which !== 3 && (active || rearrange)) {
                dragblock = false;
                onRelease();
                const indicator = canvas_div.querySelector<HTMLElement>(".indicator");
                indicator?.classList.add("invisible");

                if (active && original) {
                    original.classList.remove("dragnow");
                }
                if (drag) {
                    drag.classList.remove("dragging");
                }

                const blockIdInput = drag?.querySelector<HTMLInputElement>(".blockid");
                if (!drag || !blockIdInput) {
                    active = false;
                    rearrange = false;
                    return;
                }
                const dragId = parseInt(blockIdInput.value);

                if (dragId === 0 && rearrange) {
                    firstBlock("rearrange");
                } else if (active && blocks.length === 0) {
                    const dragRect = drag.getBoundingClientRect();
                    const canvasRect = canvas_div.getBoundingClientRect();
                    if (dragRect.top + window.scrollY > canvasRect.top + window.scrollY && dragRect.left + window.scrollX > canvasRect.left + window.scrollX) {
                        firstBlock("drop");
                    } else {
                        removeSelection();
                    }
                } else if (active || rearrange) {
                    let attached = false;
                    const blockIds = blocks.map(a => a.id);
                    for (const id of blockIds) {
                        if (checkAttach(id)) {
                            active = false;
                            if (rearrange) {
                                snap(drag, id);
                            } else if (onSnapping(drag, false, canvas_div.querySelector<HTMLInputElement>(`.blockid[value='${id}']`)!.parentNode as HTMLElement)) {
                                snap(drag, id);
                            } else {
                                removeSelection();
                            }
                            attached = true;
                            break;
                        }
                    }
                    if (!attached) {
                        if (rearrange) {
                            const parentBlock = blocks.find(b => b.id === prevblock);
                            if (parentBlock && onRearrange(drag, parentBlock)) {
                                snap(drag, prevblock);
                            } else {
                                blockstemp.forEach(tempBlock => {
                                    const blockNode = document.body.querySelector<HTMLInputElement>(`.blockid[value='${tempBlock.id}']`)?.parentNode as HTMLElement;
                                    if (blockNode) canvas_div.appendChild(blockNode);
                                    if (tempBlock.id !== 0) {
                                        const arrowNode = document.body.querySelector<HTMLInputElement>(`.arrowid[value='${tempBlock.id}']`)?.parentNode as HTMLElement;
                                        if (arrowNode) canvas_div.appendChild(arrowNode);
                                    }
                                });
                                blockstemp = [];
                                blocks.forEach(rearrangeMe);
                                removeSelection();
                            }
                        } else {
                            removeSelection();
                        }
                    }
                }
                active = false;
                rearrange = false;
            }
        };

        const checkAttach = (id: number): boolean => {
            if (!drag) return false;
            const block = blocks.find(b => b.id === id);
            if (!block) return false;

            const dragRect = drag.getBoundingClientRect();
            const canvasRect = canvas_div.getBoundingClientRect();

            const xpos = dragRect.left + window.scrollX + (dragRect.width / 2) + canvas_div.scrollLeft - canvasRect.left;
            const ypos = dragRect.top + window.scrollY + canvas_div.scrollTop - canvasRect.top;

            return (
                xpos >= block.x - (block.width / 2) - padding_x &&
                xpos <= block.x + (block.width / 2) + padding_x &&
                ypos >= block.y - (block.height / 2) &&
                ypos <= block.y + block.height
            );
        };

        const removeSelection = (): void => {
            const indicator = canvas_div.querySelector(".indicator");
            if (indicator) {
                canvas_div.appendChild(indicator);
            }
            drag?.parentNode?.removeChild(drag);
            drag = undefined;
        };

        const firstBlock = (type: "drop" | "rearrange"): void => {
            if (!drag) return;
            const blockIdInput = drag.querySelector<HTMLInputElement>(".blockid");
            if (!blockIdInput) return;

            if (type === "drop") {
                onSnapping(drag, true, undefined);
                active = false;
                const dragRect = drag.getBoundingClientRect();
                const canvasRect = canvas_div.getBoundingClientRect();
                drag.style.top = `${dragRect.top + window.scrollY - (absy + window.scrollY) + canvas_div.scrollTop}px`;
                drag.style.left = `${dragRect.left + window.scrollX - (absx + window.scrollX) + canvas_div.scrollLeft}px`;
                canvas_div.appendChild(drag);
                blocks.push({
                    parent: -1,
                    childwidth: 0,
                    id: parseInt(blockIdInput.value),
                    x: dragRect.left + window.scrollX + (dragRect.width / 2) + canvas_div.scrollLeft - canvasRect.left,
                    y: dragRect.top + window.scrollY + (dragRect.height / 2) + canvas_div.scrollTop - canvasRect.top,
                    width: dragRect.width,
                    height: dragRect.height
                });
            } else { // rearrange
                drag.classList.remove("dragging");
                rearrange = false;

                for (const tempBlock of blockstemp) {
                    if (tempBlock.id !== parseInt(blockIdInput.value)) {
                        const blockParent = document.querySelector<HTMLElement>(`.blockid[value='${tempBlock.id}']`)?.parentNode as HTMLElement;
                        const arrowParent = document.querySelector<HTMLElement>(`.arrowid[value='${tempBlock.id}']`)?.parentNode as HTMLElement;

                        if (blockParent && arrowParent) {
                             const blockRect = blockParent.getBoundingClientRect();
                             const arrowRect = arrowParent.getBoundingClientRect();

                             blockParent.style.left = `${blockRect.left + window.scrollX - window.scrollX + canvas_div.scrollLeft - 1 - absx}px`;
                             blockParent.style.top = `${blockRect.top + window.scrollY - window.scrollY + canvas_div.scrollTop - absy - 1}px`;
                             arrowParent.style.left = `${arrowRect.left + window.scrollX - window.scrollX + canvas_div.scrollLeft - absx - 1}px`;
                             arrowParent.style.top = `${arrowRect.top + window.scrollY + canvas_div.scrollTop - 1 - absy}px`;

                             canvas_div.appendChild(blockParent);
                             canvas_div.appendChild(arrowParent);

                             tempBlock.x = blockRect.left + window.scrollX + (blockParent.offsetWidth / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left - 1;
                             tempBlock.y = blockRect.top + window.scrollY + (blockParent.offsetHeight / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top - 1;
                        }
                    }
                }
                const rootBlock = blockstemp.find(b => b.id === 0);
                if (rootBlock) {
                    const dragRect = drag.getBoundingClientRect();
                    rootBlock.x = dragRect.left + window.scrollX + (dragRect.width / 2) + canvas_div.scrollLeft - canvas_div.getBoundingClientRect().left;
                    rootBlock.y = dragRect.top + window.scrollY + (dragRect.height / 2) + canvas_div.scrollTop - canvas_div.getBoundingClientRect().top;
                }
                blocks = blocks.concat(blockstemp);
                blockstemp = [];
            }
        };

        const drawArrow = (arrow: IFlowyBlock, x: number, y: number, parentId: number): void => {
            const blockIdInput = drag?.querySelector<HTMLInputElement>(".blockid");
            if (!blockIdInput) return;

            const parentBlock = blocks.find(b => b.id === parentId);
            if (!parentBlock) return;

            let path: string;
            let left: number;

            if (x < 0) {
                path = `<div class="arrowblock"><input type="hidden" class="arrowid" value="${blockIdInput.value}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${parentBlock.x - arrow.x + 5} 0L${parentBlock.x - arrow.x + 5} ${padding_y / 2}L5 ${padding_y / 2}L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${y - 5}H10L5 ${y}L0 ${y-5}Z" fill="#C5CCD0"/></svg></div>`;
                left = arrow.x - 5 - (absx + window.scrollX) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left;
            } else {
                path = `<div class="arrowblock"><input type="hidden" class="arrowid" value="${blockIdInput.value}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${padding_y / 2}L${x} ${padding_y / 2}L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x - 5} ${y - 5}H${x + 5}L${x} ${y}L${x-5} ${y - 5}Z" fill="#C5CCD0"/></svg></div>`;
                left = parentBlock.x - 20 - (absx + window.scrollX) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left;
            }
            canvas_div.innerHTML += path;
            const arrowEl = document.querySelector<HTMLElement>(`.arrowid[value='${blockIdInput.value}']`)!.parentNode as HTMLElement;
            arrowEl.style.left = `${left}px`;
            arrowEl.style.top = `${parentBlock.y + (parentBlock.height / 2) + canvas_div.getBoundingClientRect().top - absy}px`;
        };

        const updateArrow = (arrow: IFlowyBlock, x: number, y: number, children: IFlowyBlock): void => {
            const parentBlock = blocks.find(b => b.id === children.parent);
            if (!parentBlock) return;
            const arrowEl = document.querySelector<HTMLElement>(`.arrowid[value='${children.id}']`)?.parentNode as HTMLElement;
            if (!arrowEl) return;

            let newHTML: string;
            let left: number;
            if (x < 0) {
                left = arrow.x - 5 - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left;
                newHTML = `<input type="hidden" class="arrowid" value="${children.id}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${parentBlock.x - arrow.x + 5} 0L${parentBlock.x - arrow.x + 5} ${padding_y / 2}L5 ${padding_y / 2}L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${y-5}H10L5 ${y}L0 ${y-5}Z" fill="#C5CCD0"/></svg>`;
            } else {
                left = parentBlock.x - 20 - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left;
                newHTML = `<input type="hidden" class="arrowid" value="${children.id}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${padding_y / 2}L${x} ${padding_y / 2}L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x-5} ${y-5}H${x+5}L${x} ${y}L${x-5} ${y-5}Z" fill="#C5CCD0"/></svg>`;
            }
            arrowEl.style.left = `${left}px`;
            arrowEl.innerHTML = newHTML;
        };

        const snap = (dragEl: HTMLElement, parentId: number): void => {
            const blockIdInput = dragEl.querySelector<HTMLInputElement>(".blockid");
            if (!blockIdInput) return;

            if (!rearrange) {
                canvas_div.appendChild(dragEl);
            }

            const parentBlock = blocks.find(b => b.id === parentId);
            if (!parentBlock) return;
            
            const childrenOfParent = blocks.filter(b => b.parent === parentId);
            let totalwidth = childrenOfParent.reduce((acc, child) => {
                const childWidth = child.childwidth > child.width ? child.childwidth : child.width;
                return acc + childWidth + padding_x;
            }, 0);
            totalwidth += dragEl.offsetWidth;

            let totalremove = 0;
            for (const child of childrenOfParent) {
                const childNode = canvas_div.querySelector<HTMLElement>(`.blockid[value='${child.id}']`)!.parentNode as HTMLElement;
                const childWidth = child.childwidth > child.width ? child.childwidth : child.width;
                const newLeft = parentBlock.x - (totalwidth / 2) + totalremove + (child.childwidth > child.width ? (child.childwidth / 2) - (child.width / 2) : 0);
                childNode.style.left = `${newLeft}px`;
                child.x = newLeft + (child.width / 2);
                totalremove += childWidth + padding_x;
            }

            dragEl.style.left = `${parentBlock.x - (totalwidth / 2) + totalremove - (window.scrollX + absx) + canvas_div.scrollLeft + canvas_div.getBoundingClientRect().left}px`;
            dragEl.style.top = `${parentBlock.y + (parentBlock.height / 2) + padding_y - (window.scrollY + absy) + canvas_div.getBoundingClientRect().top}px`;

            const dragRect = dragEl.getBoundingClientRect();
            const canvasRect = canvas_div.getBoundingClientRect();
            const newBlock: IFlowyBlock = {
                childwidth: 0,
                parent: parentId,
                id: parseInt(blockIdInput.value),
                x: dragRect.left + window.scrollX + (dragRect.width / 2) + canvas_div.scrollLeft - canvasRect.left,
                y: dragRect.top + window.scrollY + (dragRect.height / 2) + canvas_div.scrollTop - canvasRect.top,
                width: dragRect.width,
                height: dragRect.height,
            };

            if (rearrange) {
                const tempBlock = blockstemp.find(b => b.id === newBlock.id);
                if (tempBlock) {
                    Object.assign(tempBlock, newBlock);
                }
                blocks = blocks.concat(blockstemp);
                blockstemp = [];
            } else {
                blocks.push(newBlock);
            }
            
            drawArrow(newBlock, newBlock.x - parentBlock.x + 20, padding_y, parentId);

            let currentParentId = parentId;
            while (currentParentId !== -1) {
                const parent = blocks.find(b => b.id === currentParentId);
                if (!parent) break;

                const children = blocks.filter(b => b.parent === currentParentId);
                let zwidth = 0;
                children.forEach((child, index) => {
                    const childWidth = child.childwidth > child.width ? child.childwidth : child.width;
                    zwidth += childWidth;
                    if (index < children.length - 1) {
                        zwidth += padding_x;
                    }
                });
                parent.childwidth = zwidth;
                currentParentId = parent.parent;
            }
            
            if (rearrange) {
                rearrange = false;
                drag?.classList.remove("dragging");
            }
            
            rearrangeMe();
            checkOffset();
        };

        const touchblock = (event: MouseEvent | TouchEvent): void => {
            dragblock = false;
            const target = event.target as Element;
            if (hasParentClass(target, "block")) {
                const theblock = target.closest(".block") as HTMLElement;
                if ('targetTouches' in event) {
                    mouse_x = event.targetTouches[0].clientX;
                    mouse_y = event.targetTouches[0].clientY;
                } else {
                    mouse_x = event.clientX;
                    mouse_y = event.clientY;
                }
                if (event.type !== "mouseup" && (event as MouseEvent).which !== 3) {
                    if (!active && !rearrange) {
                        dragblock = true;
                        drag = theblock;
                        const dragRect = drag.getBoundingClientRect();
                        dragx = mouse_x - (dragRect.left + window.scrollX);
                        dragy = mouse_y - (dragRect.top + window.scrollY);
                    }
                }
            }
        };

        const hasParentClass = (element: Element | null, classname: string): boolean => {
            if (!element || !element.className || typeof element.className.split !== 'function') {
                return false;
            }
            if (element.className.split(' ').includes(classname)) {
                return true;
            }
            return element.parentNode ? hasParentClass(element.parentNode as Element, classname) : false;
        };
        
        const moveBlock = (event: MouseEvent | TouchEvent): void => {
            if ('targetTouches' in event) {
                mouse_x = event.targetTouches[0].clientX;
                mouse_y = event.targetTouches[0].clientY;
            } else {
                mouse_x = event.clientX;
                mouse_y = event.clientY;
            }

            if (dragblock && drag) {
                rearrange = true;
                drag.classList.add("dragging");
                const blockId = parseInt(drag.querySelector<HTMLInputElement>(".blockid")!.value);
                const block = blocks.find(b => b.id === blockId);
                if (block) {
                    prevblock = block.parent;
                    blockstemp.push(block);
                    blocks = blocks.filter(b => b.id !== blockId);
                }
                if (blockId !== 0) {
                    document.querySelector(`.arrowid[value='${blockId}']`)?.parentNode?.removeChild(document.querySelector(`.arrowid[value='${blockId}']`)!.parentNode!);
                }

                let layerIds: number[] = blocks.filter(b => b.parent === blockId).map(b => b.id);
                const allChildIds: number[] = [];

                while (layerIds.length > 0) {
                    const nextLayerIds: number[] = [];
                    for (const id of layerIds) {
                        const childBlock = blocks.find(b => b.id === id);
                        if (childBlock) {
                            blockstemp.push(childBlock);
                            allChildIds.push(id);
                            
                            const blockParent = canvas_div.querySelector<HTMLElement>(`.blockid[value='${id}']`)?.parentNode as HTMLElement;
                            const arrowParent = canvas_div.querySelector<HTMLElement>(`.arrowid[value='${id}']`)?.parentNode as HTMLElement;

                            if (blockParent && arrowParent && drag) {
                                const dragRect = drag.getBoundingClientRect();
                                const blockRect = blockParent.getBoundingClientRect();
                                const arrowRect = arrowParent.getBoundingClientRect();
                                blockParent.style.left = `${blockRect.left + window.scrollX - (dragRect.left + window.scrollX)}px`;
                                blockParent.style.top = `${blockRect.top + window.scrollY - (dragRect.top + window.scrollY)}px`;
                                arrowParent.style.left = `${arrowRect.left + window.scrollX - (dragRect.left + window.scrollX)}px`;
                                arrowParent.style.top = `${arrowRect.top + window.scrollY - (dragRect.top + window.scrollY)}px`;
                                drag.appendChild(blockParent);
                                drag.appendChild(arrowParent);
                            }
                            nextLayerIds.push(...blocks.filter(b => b.parent === id).map(b => b.id));
                        }
                    }
                    layerIds = nextLayerIds;
                }
                blocks = blocks.filter(b => !allChildIds.includes(b.id));
                if (blocks.length > 1) {
                    rearrangeMe();
                }
                dragblock = false;
            }

            if ((active || rearrange) && drag && dragx !== undefined && dragy !== undefined) {
                if (rearrange) {
                    drag.style.left = `${mouse_x - dragx - (window.scrollX + absx) + canvas_div.scrollLeft}px`;
                    drag.style.top = `${mouse_y - dragy - (window.scrollY + absy) + canvas_div.scrollTop}px`;
                } else { // active
                    drag.style.left = `${mouse_x - dragx}px`;
                    drag.style.top = `${mouse_y - dragy}px`;
                }

                const canvasRect = canvas_div.getBoundingClientRect();
                if (mouse_x > canvasRect.width + canvasRect.left - 10) canvas_div.scrollLeft += 10;
                else if (mouse_x < canvasRect.left + 10) canvas_div.scrollLeft -= 10;
                if (mouse_y > canvasRect.height + canvasRect.top - 10) canvas_div.scrollTop += 10;
                else if (mouse_y < canvasRect.top + 10) canvas_div.scrollTop -= 10;
                
                let indicatorVisible = false;
                for (const block of blocks) {
                    if (checkAttach(block.id)) {
                        const parentNode = canvas_div.querySelector<HTMLElement>(`.blockid[value='${block.id}']`)?.parentNode as HTMLElement;
                        const indicator = canvas_div.querySelector<HTMLElement>(".indicator");
                        if (parentNode && indicator) {
                            parentNode.appendChild(indicator);
                            indicator.style.left = `${(parentNode.offsetWidth / 2) - 5}px`;
                            indicator.style.top = `${parentNode.offsetHeight}px`;
                            indicator.classList.remove("invisible");
                            indicatorVisible = true;
                        }
                        break;
                    }
                }
                if (!indicatorVisible) {
                    canvas_div.querySelector(".indicator")?.classList.add("invisible");
                }
            }
        };

        const checkOffset = (): void => {
            const xPositions = blocks.map(a => a.x - (a.width / 2));
            offsetleft = Math.min(...xPositions);
            const canvasRect = canvas_div.getBoundingClientRect();
            
            if (offsetleft < (canvasRect.left + window.scrollX - absx)) {
                blocks.forEach(block => {
                    const blockNode = canvas_div.querySelector<HTMLElement>(`.blockid[value='${block.id}']`)?.parentNode as HTMLElement;
                    if (blockNode) {
                        blockNode.style.left = `${block.x - (block.width / 2) - offsetleft + canvasRect.left - absx + 20}px`;
                    }
                    if (block.parent !== -1) {
                         const parentBlock = blocks.find(b => b.id === block.parent);
                         if (parentBlock) {
                             const arrowx = block.x - parentBlock.x;
                             const arrowNode = canvas_div.querySelector<HTMLElement>(`.arrowid[value='${block.id}']`)?.parentNode as HTMLElement;
                             if (arrowNode) {
                                 if (arrowx < 0) {
                                     arrowNode.style.left = `${block.x - offsetleft + 20 - 5 + canvasRect.left - absx}px`;
                                 } else {
                                     arrowNode.style.left = `${parentBlock.x - 20 - offsetleft + canvasRect.left - absx + 20}px`;
                                 }
                             }
                         }
                    }
                });
                blocks.forEach(block => {
                    const blockNode = canvas_div.querySelector<HTMLElement>(`.blockid[value='${block.id}']`)?.parentNode as HTMLElement;
                    if (blockNode) {
                        const blockRect = blockNode.getBoundingClientRect();
                        block.x = blockRect.left + window.scrollX + canvas_div.scrollLeft + (blockRect.width / 2) - 20 - canvasRect.left;
                    }
                });
            }
        };

        const rearrangeMe = (): void => {
            const parentIds = [...new Set(blocks.map(a => a.parent))];
            parentIds.forEach(parentId => {
                if(parentId === -1) return;

                const parentBlock = blocks.find(b => b.id === parentId);
                if (!parentBlock) return;
                
                const children = blocks.filter(b => b.parent === parentId);
                children.forEach(child => {
                    if (blocks.filter(b => b.parent === child.id).length === 0) {
                        child.childwidth = 0;
                    }
                });

                let totalwidth = 0;
                children.forEach((child, index) => {
                    const effectiveWidth = child.childwidth > child.width ? child.childwidth : child.width;
                    totalwidth += effectiveWidth;
                    if (index < children.length - 1) {
                        totalwidth += padding_x;
                    }
                });
                parentBlock.childwidth = totalwidth;
                
                let totalremove = 0;
                children.forEach(child => {
                    const childNode = canvas_div.querySelector<HTMLElement>(`.blockid[value='${child.id}']`)?.parentNode as HTMLElement;
                    if(childNode){
                        childNode.style.top = `${parentBlock.y + padding_y + canvas_div.getBoundingClientRect().top - absy}px`;
                        
                        const childWidth = child.childwidth > child.width ? child.childwidth : child.width;
                        const newLeft = parentBlock.x - (totalwidth / 2) + totalremove - (absx + window.scrollX) + canvas_div.getBoundingClientRect().left + (child.childwidth > child.width ? (child.childwidth / 2) - (child.width / 2) : 0);
                        childNode.style.left = `${newLeft}px`;
                        child.x = parentBlock.x - (totalwidth / 2) + totalremove + (child.width / 2) + (child.childwidth > child.width ? (child.childwidth / 2) - (child.width / 2) : 0);
                        totalremove += childWidth + padding_x;
                        
                        updateArrow(child, child.x - parentBlock.x + 20, padding_y, child);
                    }
                });
                parentBlock.y += padding_y;
            });
        };
        
        load();
        
        return api;
    }

    /** The public API for interacting with the Flowy instance. */
    export interface FlowyApi {
        /**
         * Imports flowchart data to render it on the canvas.
         * @param output The data object containing the HTML structure and block array.
         */
        import(output: IFlowyImport): void;

        /**
         * Exports the current state of the flowchart.
         * @returns An object containing the HTML, block array, and detailed block data.
         */
        output(): IFlowyOutput | undefined;

        /**
         * Deletes all blocks from the canvas and resets the state.
         */
        deleteBlocks(): void;
    }
}