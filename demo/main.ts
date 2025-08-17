/// <reference path="../engine/flowy.ts" />

namespace appn.demo {

    class Demo {
        private rightcard: boolean = false;
        private tempblock: HTMLElement | null = null;
        private tempblock2: HTMLElement | null = null;
        private aclick: boolean = false;
        private noinfo: boolean = false;
        private flowyInstance!: appn.flowy.Flowy;

        constructor() {
            this.init();
        }

        private init(): void {
            const blocklist = document.getElementById("blocklist");
            if (blocklist) {
                blocklist.innerHTML = '<div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="1"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/eye.svg"></div><div class="blocktext">                        <p class="blocktitle">New visitor</p><p class="blockdesc">Triggers when somebody visits a specified page</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="2"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/action.svg"></div><div class="blocktext">                        <p class="blocktitle">Action is performed</p><p class="blockdesc">Triggers when somebody performs a specified action</p></div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="3"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/time.svg"></div><div class="blocktext">                        <p class="blocktitle">Time has passed</p><p class="blockdesc">Triggers after a specified amount of time</p>          </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="4"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/error.svg"></div><div class="blocktext">                        <p class="blocktitle">Error prompt</p><p class="blockdesc">Triggers when a specified error happens</p>              </div></div></div>';
            }
            const canvas = document.getElementById("canvas");
            if (canvas) {
                this.flowyInstance = appn.flowy.create(canvas, this.drag.bind(this), this.release.bind(this), this.snapping.bind(this));
            }

            this.addEventListenerMulti("click", this.disabledClick.bind(this), false, ".side");
            const close = document.getElementById("close");
            if (close) {
                close.addEventListener("click", () => {
                    if (this.rightcard) {
                        this.rightcard = false;
                        document.getElementById("properties")?.classList.remove("expanded");
                        setTimeout(() => {
                            document.getElementById("propwrap")?.classList.remove("itson");
                        }, 300);
                        this.tempblock?.classList.remove("selectedblock");
                    }
                });
            }

            const removeblock = document.getElementById("removeblock");
            if (removeblock) {
                removeblock.addEventListener("click", () => {
                    this.flowyInstance.deleteBlocks();
                });
            }

            document.addEventListener("mousedown", this.beginTouch.bind(this), false);
            document.addEventListener("mousemove", this.checkTouch.bind(this), false);
            document.addEventListener("mouseup", this.doneTouch.bind(this), false);
            this.addEventListenerMulti("touchstart", this.beginTouch.bind(this), false, ".block");
        }

        private addEventListenerMulti(type: string, listener: EventListener, capture: boolean, selector: string): void {
            const nodes: NodeListOf<Element> = document.querySelectorAll(selector);
            for (let i = 0; i < nodes.length; i++) {
                nodes[i].addEventListener(type, listener, capture);
            }
        }

        private snapping(drag: HTMLElement, first: boolean, parent?: HTMLElement): boolean {
            const grab = drag.querySelector<HTMLElement>(".grabme");
            if (grab && grab.parentNode) {
                grab.parentNode.removeChild(grab);
            }
            const blockin = drag.querySelector<HTMLElement>(".blockin");
            if (blockin && blockin.parentNode) {
                blockin.parentNode.removeChild(blockin);
            }
            const blockelemtype = (drag.querySelector(".blockelemtype") as HTMLInputElement).value;
            switch (blockelemtype) {
                case "1":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/eyeblue.svg'><p class='blockyname'>New visitor</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>When a <span>new visitor</span> goes to <span>Site 1</span></div>";
                    break;
                case "2":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/actionblue.svg'><p class='blockyname'>Action is performed</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>When <span>Action 1</span> is performed</div>";
                    break;
                case "3":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/timeblue.svg'><p class='blockyname'>Time has passed</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>When <span>10 seconds</span> have passed</div>";
                    break;
                case "4":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/errorblue.svg'><p class='blockyname'>Error prompt</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>When <span>Error 1</span> is triggered</div>";
                    break;
                case "5":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/databaseorange.svg'><p class='blockyname'>New database entry</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Add <span>Data object</span> to <span>Database 1</span></div>";
                    break;
                case "6":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/databaseorange.svg'><p class='blockyname'>Update database</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Update <span>Database 1</span></div>";
                    break;
                case "7":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/actionorange.svg'><p class='blockyname'>Perform an action</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Perform <span>Action 1</span></div>";
                    break;
                case "8":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/twitterorange.svg'><p class='blockyname'>Make a tweet</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Tweet <span>Query 1</span> with the account <span>@alyssaxuu</span></div>";
                    break;
                case "9":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/logred.svg'><p class='blockyname'>Add new log entry</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Add new <span>success</span> log entry</div>";
                    break;
                case "10":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/logred.svg'><p class='blockyname'>Update logs</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Edit <span>Log Entry 1</span></div>";
                    break;
                case "11":
                    drag.innerHTML += "<div class='blockyleft'><img src='assets/errorred.svg'><p class='blockyname'>Prompt an error</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div><div class='blockyinfo'>Trigger <span>Error 1</span></div>";
                    break;
            }
            return true;
        }

        private drag(block: HTMLElement): void {
            block.classList.add("blockdisabled");
            this.tempblock2 = block;
        }

        private release(): void {
            if (this.tempblock2) {
                this.tempblock2.classList.remove("blockdisabled");
            }
        }

        private disabledClick(event: Event): void {
            const navactive = document.querySelector(".navactive");
            if (navactive) {
                navactive.classList.add("navdisabled");
                navactive.classList.remove("navactive");
            }
            (event.currentTarget as HTMLElement).classList.add("navactive");
            (event.currentTarget as HTMLElement).classList.remove("navdisabled");
            const id = (event.currentTarget as HTMLElement).getAttribute("id");
            const blocklist = document.getElementById("blocklist");
            if (blocklist) {
                if (id == "triggers") {
                    blocklist.innerHTML = '<div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="1"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/eye.svg"></div><div class="blocktext">                        <p class="blocktitle">New visitor</p><p class="blockdesc">Triggers when somebody visits a specified page</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="2"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/action.svg"></div><div class="blocktext">                        <p class="blocktitle">Action is performed</p><p class="blockdesc">Triggers when somebody performs a specified action</p></div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="3"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/time.svg"></div><div class="blocktext">                        <p class="blocktitle">Time has passed</p><p class="blockdesc">Triggers after a specified amount of time</p>          </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="4"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/error.svg"></div><div class="blocktext">                        <p class="blocktitle">Error prompt</p><p class="blockdesc">Triggers when a specified error happens</p>              </div></div></div>';
                } else if (id == "actions") {
                    blocklist.innerHTML = '<div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="5"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/database.svg"></div><div class="blocktext">                        <p class="blocktitle">New database entry</p><p class="blockdesc">Adds a new entry to a specified database</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="6"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/database.svg"></div><div class="blocktext">                        <p class="blocktitle">Update database</p><p class="blockdesc">Edits and deletes database entries and properties</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="7"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/action.svg"></div><div class="blocktext">                        <p class="blocktitle">Perform an action</p><p class="blockdesc">Performs or edits a specified action</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="8"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/twitter.svg"></div><div class="blocktext">                        <p class="blocktitle">Make a tweet</p><p class="blockdesc">Makes a tweet with a specified query</p>        </div></div></div>';
                } else if (id == "loggers") {
                    blocklist.innerHTML = '<div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="9"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/log.svg"></div><div class="blocktext">                        <p class="blocktitle">Add new log entry</p><p class="blockdesc">Adds a new log entry to this project</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="10"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/log.svg"></div><div class="blocktext">                        <p class="blocktitle">Update logs</p><p class="blockdesc">Edits and deletes log entries in this project</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="11"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/error.svg"></div><div class="blocktext">                        <p class="blocktitle">Prompt an error</p><p class="blockdesc">Triggers a specified error</p>        </div></div></div>';
                }
            }
        }

        private beginTouch(event: Event): void {
            this.aclick = true;
            this.noinfo = false;
            if ((event.target as HTMLElement).closest(".create-flowy")) {
                this.noinfo = true;
            }
        }

        private checkTouch(event: Event): void {
            this.aclick = false;
        }

        private doneTouch(event: Event): void {
            if (event.type === "mouseup" && this.aclick && !this.noinfo) {
                const target = event.target as HTMLElement;
                const block = target.closest<HTMLElement>(".block");
                if (!this.rightcard && block && !block.classList.contains("dragging")) {
                    this.tempblock = block;
                    this.rightcard = true;
                    document.getElementById("properties")?.classList.add("expanded");
                    document.getElementById("propwrap")?.classList.add("itson");
                    if (this.tempblock) {
                        this.tempblock.classList.add("selectedblock");
                    }
                }
            }
        }

        public static main(): void {
            document.addEventListener("DOMContentLoaded", () => {
                new Demo();
            });
        }
    }

    Demo.main();
}
