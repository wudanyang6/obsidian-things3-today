#!/usr/bin/osascript -l JavaScript

function run(argv) {

    switch (argv[0]) {
        case "today":
            return getTodayList()
            break;
        case "complete":
            complete(argv);
            break
        default:
            return getTodayList()
            break;
    }
}

function getTodayList() {
    let content = ""
    Application("Things").lists.byId("TMTodayListSource").toDos().forEach( t => {
        content += "<ul><input type=\"checkbox\" class=\"things-today-checkbox\" tid=\""+t.id()+"\"><div style=\"display:contents\"><a href=\"things:///show?id="+t.id()+"\">"+t.name()+"</a></div></ul>"
    })

    return content
}

function complete(argv) {
    const todoId = argv[1]
    if (!todoId) {
        return
    }

    Application("Things").toDos.byId(todoId).status = "completed"
}