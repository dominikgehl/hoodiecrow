"use strict";

var makeSearch = require("./handlers/search");

module.exports = function(connection, parsed, data, callback){

    if(connection.state != "Selected"){
        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes:[
                {type: "TEXT", value: "Select mailbox first"}
            ]
        }, "SEARCH FAILED", parsed, data);
        return callback();
    }

    if(!parsed.attributes || !parsed.attributes.length){
        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes:[
                {type: "TEXT", value: "SEARCH expects search criteria, empty query given"}
            ]
        }, "SEARCH FAILED", parsed, data);
        return callback();
    }

    var params;

    try{
        params = parsed.attributes.map(function(argument, i){
            if(["STRING", "ATOM", "LITERAL", "SEQUENCE"].indexOf(argument.type) < 0){
                throw new Error("Invalid search criteria argument #" + (i + 1));
            }
            return argument.value;
        });
    }catch(E){
        connection.send({
            tag: parsed.tag,
            command: "BAD",
            attributes:[
                {type: "TEXT", value: E.message}
            ]
        }, "SEARCH FAILED", parsed, data);
        return callback();
    }

    var messages = connection.selectedMailbox.messages,
        searchResult;

    for(var i=0, len=connection.notificationQueue.length; i<len; i++){
        if(connection.notificationQueue[i].mailboxCopy){
            messages = connection.notificationQueue[i].mailboxCopy;
            break;
        }
    }

    try{
        searchResult = makeSearch(connection, messages, params);
    }catch(E){
        connection.send({
            tag: parsed.tag,
            command: "NO",
            attributes:[
                {type: "TEXT", value: E.stack}
            ]
        }, "SEARCH FAILED", parsed, data);
        return callback();
    }

    if(searchResult && searchResult.list && searchResult.list.length){
        connection.send({
            tag: "*",
            command: "SEARCH",
            attributes: searchResult.list.map(function(item){
                return searchResult.numbers[item.uid];
            })
        }, "SEARCH", parsed, data);
    }

    connection.send({
        tag: parsed.tag,
        command: "OK",
        attributes:[
            {type: "TEXT", value: "SEARCH completed"}
        ]
    }, "SEARCH", parsed, data);
    return callback();
};
