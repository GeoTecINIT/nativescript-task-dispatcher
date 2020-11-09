import { taskDispatcher } from "nativescript-task-dispatcher";
import { taskGraphBrowser } from "nativescript-task-dispatcher/internal/tasks/graph/browser";
/*
In NativeScript, a file with the same name as an XML file is known as
a code-behind file. The code-behind is a great place to place your view
logic, and to set up your page’s data binding.
*/

import { NavigatedData, Page } from "tns-core-modules/ui/page";

import { HomeViewModel } from "./home-view-model";
export function onNavigatingTo(args: NavigatedData) {
    const page = <Page>args.object;

    page.bindingContext = new HomeViewModel();

    emitStartEvent()
        .then(() => {
            console.log("Start event emitted!");
            console.log(
                "The following task graph has been loaded and prepared:"
            );
            console.log(taskGraphBrowser.depict());
        })
        .catch((err) => {
            console.error(`Could not emit start event: ${err}`);
        });
}

async function emitStartEvent() {
    const isReady = await taskDispatcher.isReady();
    if (!isReady) {
        const tasksNotReady = await taskDispatcher.tasksNotReady;
        console.log(
            `The following tasks are not ready!: ${tasksNotReady}.Going to prepare them...`
        );
        await taskDispatcher.prepare();
    }
    taskDispatcher.emitEvent("startEvent");
}
