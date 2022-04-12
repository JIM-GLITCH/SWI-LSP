// const { time } = require("console");
import {Parser} from "../server/out/parser.js"
import { time, timeEnd } from "console";
import *  as fs from "fs";
import {read_tokens,InputStream}from "../server/out/lexer.js"
const  parser = new Parser();
const text = fs.readFileSync("./t0.pl").toString();
// const text =""
// time("1")
// parser.parseText(text);
// timeEnd("1")
// time("1")
// parser.parseText(text);
// timeEnd("1")
// time("1")
// parser.parseText(text);
// timeEnd("1")
// time("1")
// parser.parseText(text);
// timeEnd("1")
// time("1")
// parser.parseText(text);
// timeEnd("1")
let s;
console.time("lexer");
	s = InputStream(text);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		// console.log(tokens);
	}
console.timeEnd("lexer")
console.time("lexer");
	s = InputStream(text);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		// console.log(tokens);
	}
console.timeEnd("lexer")
console.time("lexer");
	s = InputStream(text);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		// console.log(tokens);
	}
console.timeEnd("lexer")
console.time("lexer");
	s = InputStream(text);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		// console.log(tokens);
	}
console.timeEnd("lexer")
console.time("lexer");
	s = InputStream(text);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		// console.log(tokens);
	}
console.timeEnd("lexer")
console.time("lexer");
	s = InputStream(text);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		// console.log(tokens);
	}
console.timeEnd("lexer")


