"use strict";

let form = document.getElementById("Login_Area");
function check(username, password) {
    //Just a sample here.Need to implement real check.
    if (username.length >= 15){
        form.action="MainPage.ejs";
    } else {
        form.action="LoginFailPage.ejs";
    }
}
let text = form.elements.email;
let password = form.elements.pwd;
form.onsubmit = function(){
    check(text.value,password.value);
} ;