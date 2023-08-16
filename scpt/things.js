#!/usr/bin/osascript -l JavaScript

function run(argv) {
    let content = ""
    Application("Things").lists.byId("TMTodayListSource").toDos().forEach( t => {
        content += "<p><a href=\"things:///show?id="+t.id()+"\">"+t.name()+"</a></p>"
    })

    return content
}