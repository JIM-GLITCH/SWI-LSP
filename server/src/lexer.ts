
import fs = require("fs");
import { Range, uinteger } from 'vscode-languageserver';
export {read_tokens, InputStream,token,stream,tokenType,debug,read_token_list};

/**
 * test
 * 
 * console.time("readfile");  ;console.timeEnd("readfile")
 * 
 *  
 */
function debug(){
	console.time("debug");
	const fileString = fs.readFileSync("./server/src/test/t.pl").toString();
	const s = InputStream(fileString);
	for(;;){
		const tokens =  read_tokens(s);
		if (tokens==undefined) break;
		console.log(tokens);
	}
	console.timeEnd("debug");
}

interface stream {
	text: string;
	line: uinteger;
	char: uinteger;
	offset: uinteger;
}
/**
 *  start and end offset from zero 
 */
interface FromTo{
	/**  offset from zero */
	start:number;
	/**  offset from zero */
	end:number
}
interface partialToken {
	/**
	 * token range
	 */
	range: Range;
	// fromTo:FromTo;
	kind: K;
}


interface token extends partialToken{
	/**
	 * leading spaces and comments
	 */
	layout: string;
	/**
	 * token string
	 */
	text: string;
	/**
	 * layout and token range
	 */
	next?:token|undefined;
	/**
	 *  maybe no need to keep this info
	 */
	fullRange: Range

}


function InputStream(input: string): stream {
	return {
		text: input,
		line: 0,
		char: 0,
		offset: 0,
	};
}
function read_token_list(stream: stream) {
	if (eos(stream)){
		return undefined;
	}
	const tokens: token[] = token_list(stream);
	return tokens;
}
function read_tokens(stream: stream) {
	if (eos(stream)){
		return undefined;
	}
	const tokens: token[] = token_list(stream);
	const end_token =end(stream);

	if(end_token) tokens.push(end_token);

	if (tokens.length == 0) return undefined;

	return tokens;
}


function end_token(s: stream) {
	const state0 = getStreamState(s);
	const char1 = getchar(s);
	if (char1 != ".") return setStreamState(s, state0);
	const state1 = getStreamState(s);
	const char2 = layout_char(s);
	if (char2 != undefined) { setStreamState(s, state1); return "."; }
	const char3 = getchar(s);
	if (char3 == "%") { setStreamState(s, state1); return "."; }
	if (char3 == "") { return "."; }
	return undefined;

}
function eos(s:stream){
	if (s.text.charAt(s.offset)==""){
		return true;
	}
	return false;
}
function token_list(s: stream) {
	const tokens: Array<token> = [];
	let t;
	for (; ;) {
		t = atoken(s);
		if (!t) {
			break;
		}
		tokens.push(t);
	}
	return tokens;
}
function atoken(stream: stream): token | undefined {
	return matchAny([
		atom,
		variable,
		float,
		integer,
		double_quoted_list, 
		back_quoted_string,
		quasi_quoted_string,
		open,
		close,
		open_list,
		close_list,
		open_curly,
		close_curly,
		ht_sep,
		comma
	])(stream);
}


function getStreamState(s: stream): [uinteger, uinteger, uinteger] {
	return [s.line, s.char, s.offset];
}
function setStreamState(s: stream, state: [uinteger, uinteger, uinteger]): undefined {
	[s.line, s.char, s.offset] = state;
	return undefined;
}






/**
 * 
 * @param type 
 * @returns {(s:stream)=>?token} 
 */


type tokenType = K;

function atom(s: stream){
	return token_func_gen(atom_token,K.atom)(s);
}

const end = token_func_gen(end_token,K.end);

const variable = token_func_gen(variable_token,K.variable);

const integer = token_func_gen(integer_token,K.integer);

const float = token_func_gen(float_token,K.float);

const double_quoted_list=token_func_gen(double_quoted_list_token,K.string);

const open = token_func_gen(open_token,K.open);

const close = token_func_gen(close_token,K.close);

const open_list = token_func_gen(open_list_token,K.open_list);

const close_list= token_func_gen(close_list_token,K.close_list);

const open_curly = token_func_gen(open_curly_token,K.open_curly);

const close_curly = token_func_gen(close_curly_token,K.close_curly);

const ht_sep =token_func_gen(ht_sep_token,K.ht_sep);

const comma =token_func_gen(comma_token,K.comma);

const  back_quoted_string= token_func_gen(back_quoted_string_token,K.back_quoted_string);

const quasi_quoted_string= token_func_gen(quasi_quoted_string_token,K.quasi_quoted_string_token);

/*

                            tokens 

*/

function quasi_quoted_string_token(s:stream) {
	return matchAll([
		(s)=>getWantedStr(s,"{|"),
		zero_or_more((s)=>getCharNotStr(s,"|}")),
		(s)=>getWantedStr(s,"|}"),
	])(s)
}


function getCharNotStr(s:stream,str:string) {
	const length = str.length;
	const start = s.offset;
	const lookedStr = s.text.slice(start,start+length);
	if (lookedStr != str){
		const c = lookedStr[0];
		streamConsume(s,c);
		return c;
	}
	return undefined
}
function matchAny(f:((s: stream) => any)[]):any{
	return function(s:stream){
		const state0=getStreamState(s);
		for (let index = 0; index < f.length; index++) {
			const str = f[index](s);
			if (str!=undefined)
			{
				return str;
			}
			setStreamState(s,state0);
		}
		return undefined;
	};
}
function semicolon_token(s:stream){
	return getWantedChar(s,";");
}
const atom_token=matchAny([
		letter_digit_token,
		graphic_token,
		quoted_token,
		semicolon_token,
		cut_token,
		]);


function streamConsume(s:stream,str:string):undefined{
	for (let index = 0; index < str.length; index++) {
		const char = str[index];
		if (char == "") {
			return undefined;
		}
		if (char == "\n") {
			s.line += 1;
			s.char = 0;
		}
		else {
			s.char += 1;
		}
		s.offset += 1;
	}
	return undefined;
}

function letter_digit_token(s:stream){
	return matchAll([
		small_letter_char,
		alphanumeric_char_list
	])(s);
}

function getWantedChar(s:stream,char_expected:string){
	const char = s.text.charAt(s.offset);
	if(char !=char_expected){
		return undefined;
	}
	// eslint-disable-next-line no-empty
	if (char == "") {
		
	}
	if (char == "\n") {
		s.line += 1;
		s.char = 0;
	}
	else {
		s.char += 1;
	}
	s.offset += 1;
	return char;
}
function graphic_token(s:stream){
	const state0 = getStreamState(s);
	const c1 = matchAll([
		(s:stream)=>getWantedChar(s,"."),
		matchAny([
			layout_char,
			(s:stream)=>getWantedChar(s,"%"),
			(s:stream)=>getWantedChar(s,""), //getWantedChar(s,"") means end-of-file
		])
	])(s);
	if (c1!==undefined){
		setStreamState(s,state0);
		return undefined;
	}
	return matchAll([
		graphic_token_char,
		graphic_token_chars
	])(s);

}
const graphic_char = matchAny([
	(s:stream)=>getWantedChar(s,"#"),
	(s:stream)=>getWantedChar(s,"$"),
	(s:stream)=>getWantedChar(s,"&"),
	(s:stream)=>getWantedChar(s,"*"),
	(s:stream)=>getWantedChar(s,"+"),
	(s:stream)=>getWantedChar(s,"-"),
	(s:stream)=>getWantedChar(s,"."),
	(s:stream)=>getWantedChar(s,"/"),
	(s:stream)=>getWantedChar(s,":"),
	(s:stream)=>getWantedChar(s,"<"),
	(s:stream)=>getWantedChar(s,"="),
	(s:stream)=>getWantedChar(s,">"),
	(s:stream)=>getWantedChar(s,"?"),
	(s:stream)=>getWantedChar(s,"@"),
	(s:stream)=>getWantedChar(s,"^"),
	(s:stream)=>getWantedChar(s,"~")
]);
const graphic_token_char = matchAny([
	graphic_char,
	backslash_char
]);

const  graphic_token_chars =zero_or_more(graphic_token_char);

function quoted_token(s:stream){
	return matchAll([
		single_quote_char,
		single_quoted_items,
		single_quote_char
	])(s);
}
// 6.5.5 Meta characters
const meta_char = matchAny([
	backslash_char,
	single_quote_char,
	double_quote_char,
	back_quote_char
]);
function backslash_char(s:stream){
	return getWantedChar(s,"\\");
}
function single_quote_char(s:stream){
	return getWantedChar(s,"'");
}
function double_quote_char(s:stream){
	return getWantedChar(s,"\"");
}
function back_quote_char(s:stream){
	return getWantedChar(s,"`");
}
const solo_char=matchAny([
	cut_char,
	open_char,
	close_char,
	comma_char,
	semicolon_char,
	open_list_char,
	close_list_char,
	open_curly_char,
	close_curly_char,
	head_tail_separator_char,
	end_line_comment_char,
]);
const non_quote_char=matchAny([
	meta_escape_sequence,
	control_escape_sequence,
	octal_escape_sequence,
	hexcadecimal_escape_sequence,
	graphic_char,
	alphanumeric_char,
	solo_char,
	space_char
]);
function control_escape_sequence(s:stream){
	return matchAll([
		backslash_char,
		symbolic_control_char
	])(s);
}
const single_quoted_item=matchAny([
	continuation_escape_sequence,
	single_quoted_character
]);
const single_quoted_items = zero_or_more(single_quoted_item);

function continuation_escape_sequence(s:stream){
	return matchAll([
		backslash_char,
		new_line_char
	])(s);
}

function cut_token(s:stream){
	return getWantedChar(s,"!")	;
}

//  6.4.2.1 Quoted characters
function single_quoted_character(s:stream){
	return matchAny([
		non_quote_char,
		matchAll([single_quote_char,single_quote_char]),
		double_quote_char,
		back_quote_char
	])(s);
}
function double_quoted_character(s:stream){
	return matchAny([
		matchAll([double_quote_char,double_quote_char]),
		single_quote_char,
		non_quote_char,
		back_quote_char
	])(s);
}
function back_quoted_character(s:stream){
	return matchAny([
		matchAll([back_quote_char,back_quote_char]),
		single_quote_char,
		non_quote_char,
		double_quote_char,
	])(s);
}

function meta_escape_sequence(s:stream){
	return matchAll([
		backslash_char,
		meta_char
	])(s);
}


const symbolic_control_char=matchAny([
	symbolic_alert_char,
	symbolic_backspace_char,
	symbolic_carriage_return_char,
	symbolic_form_feed_char,
	symbolic_horizontal_tab_char,
	symbolic_new_line_char,
	symbolic_vertical_tab_char,
	(s)=>getWantedChar(s,"e")
]);
function symbolic_alert_char(s:stream){
	return getWantedChar(s,"a");
}
function symbolic_backspace_char(s:stream){
	return getWantedChar(s,"b");
}
function symbolic_carriage_return_char(s:stream){
	return getWantedChar(s,"r");
}
function symbolic_form_feed_char(s:stream){
	return getWantedChar(s,"f");
}
function symbolic_horizontal_tab_char(s:stream){
	return getWantedChar(s,"t");
}
function symbolic_new_line_char(s:stream){
	return getWantedChar(s,"n");
}
function symbolic_vertical_tab_char(s:stream){
	return getWantedChar(s,"v");
}

function octal_escape_sequence(s:stream){
	return matchAll([
		backslash_char,
		octal_digit_char,
		octal_digit_char_list,
		matchAny([
			backslash_char,
			(_)=>{return "";}
		])
	])(s);
}
function octal_digit_char_list(s:stream){
	return zero_or_more(octal_digit_char)(s);
}
function hexcadecimal_escape_sequence(s:stream){
	return matchAll([
		backslash_char,
		symbolic_hexadecimal_char,
		hexadecimal_digit_char,
		hexadecimal_digit_char_list,
		backslash_char
	])(s);
}


function symbolic_hexadecimal_char(s:stream){
	return getWantedChar(s,"x");
}

// 6.4.3 Variables

function variable_token(s:stream){
	return matchAny([named_variable,anonymous_variable])(s);
}

function anonymous_variable(s:stream){
	return getWantedChar(s,"_");
}

function named_variable(s:stream){
	return matchAny([
		matchAll([
			variable_indicator_char,
			alphanumeric_char,
			alphanumeric_char_list
		]),
		matchAll([
			capital_letter_char,
			alphanumeric_char_list
		])
	])(s);
}
function variable_indicator_char(s:stream){
	return getWantedChar(s,"_");
}
//  6.4.4 Integer numbers
function matchAll(f:((s:stream)=>string|undefined)[]){
	return function(s:stream){
	const state0=getStreamState(s);
	let c0 = "";
	for (const t of f){
		const c= t(s);
		if (c ==undefined){
			setStreamState(s,state0);
			return undefined;
		}
		c0+=c;		
	}
	return c0;
};
}
function integer_token(s:stream){ 
	return matchAny([
		character_code_constant,
		binary_constant,
		octal_constant,
		hexadecimal_constant,
		integer_constant,
	])(s);
}

const decimal_digit_char_list=zero_or_more(decimal_digit_char);
const integer_constant=matchAll([
	decimal_digit_char,
	decimal_digit_char_list,
]);

function decimal_digit_char(s:stream){
	const state0=getStreamState(s);
	const c = getchar(s);
	if(c>="0" && c<= "9")
		return c;
	setStreamState(s,state0);
	return undefined;	
}
const character_code_constant=matchAll([
	(s:stream)=>getWantedChar(s,"0"),
	single_quote_char,
	matchAny([single_quoted_character,single_quote_char])
]);
function binary_constant(s:stream){ 
	return matchAll([
		binary_constant_indicator,
		binary_digit_char,
		binary_digit_char_list
	])(s);
}
const binary_digit_char_list =zero_or_more(binary_digit_char);
function binary_digit_char(s:stream){
	const state0=getStreamState(s);
	const c = getchar(s);
	if(c=="0"  || c== "1")
		return c;
	setStreamState(s,state0);
	return undefined;	
}
function binary_constant_indicator(s:stream){
	if (s.text.slice(s.offset,s.offset+2)=="0b"){
		streamConsume(s,"0b");
		return "0b";
	}
	return undefined;
}

const octal_constant=matchAll([
	octal_constant_indicator,
	octal_digit_char,
	octal_digit_char_list
]);
function octal_digit_char(s:stream){
	const state0=getStreamState(s);
	const c = getchar(s);
	if(c>="0" && c<= "7")
		return c;
	setStreamState(s,state0);
	return undefined;	
}
function octal_constant_indicator(s:stream){
	if (s.text.slice(s.offset,s.offset+2)=="0o"){
		streamConsume(s,"0o");
		return "0o";
	}
	return undefined;
}

const hexadecimal_digit_char_list=zero_or_more(hexadecimal_digit_char);
const hexadecimal_constant = matchAll([
	hexadecimal_constant_indicator,
	hexadecimal_digit_char,
	hexadecimal_digit_char_list
]);

function hexadecimal_constant_indicator(s:stream){
	if (s.text.slice(s.offset,s.offset+2)=="0x"){
		streamConsume(s,"0x");
		return "0x";
	}
	return undefined;
}

function hexadecimal_digit_char(s:stream){
	const state0=getStreamState(s);
	const c = getchar(s);
	if((c>="0" && c<= "9")
	|| (c>="A" && c<= "F")
	|| (c>="a" && c<= "f"))
		return c;
	setStreamState(s,state0);
	return undefined;	
}
function underscore_char(s:stream):string | undefined | undefined{
	return getWantedChar(s,"_");
}
//  6.4.5 Floating point number
function decimal_point_char(s:stream){
	return getWantedChar(s,".");
}
const fraction=matchAll([
	decimal_point_char,
	decimal_digit_char,
	decimal_digit_char_list
]);
const sign = matchAny([
	(s:stream)=>getWantedChar(s,"+"),
	(s:stream)=>getWantedChar(s,"-"),

]);
const exponent_char=matchAny([
	(s:stream)=>getWantedChar(s,"e"),
	(s:stream)=>getWantedChar(s,"E"),
]);
const exponent =matchAll([
	exponent_char,
	matchAny([sign,(s:stream)=>{return "";}]),
	integer_constant
]);
function float_token(s:stream) {
	return matchAll([
	integer_constant,
	fraction,
	matchAny([exponent,(s:stream)=>{return "";}])
])(s);
}

// 6.4.6 Double quoted lists
const double_quoted_item =matchAny([
	double_quoted_character,
	continuation_escape_sequence
]);
const double_quoted_item_list=zero_or_more(double_quoted_item);
function double_quoted_list_token(s:stream) {
	return matchAll([
	double_quote_char,
	double_quoted_item_list,
	double_quote_char
])(s);
}


// 6.4.7 back quoted strings

const back_quoted_item=matchAny([
	back_quoted_character,
	continuation_escape_sequence
]);
const back_quoted_item_list=zero_or_more(back_quoted_item);

// 6.4.8 Other tokens
function open_token(s:stream){
	return open_char(s);
}
function close_token(s:stream){
	return close_char(s);
}
function open_list_token(s:stream){
	return open_list_char(s);
}
function close_list_token(s:stream){
	return close_list_char(s);
}
function open_curly_token(s:stream){
	return open_curly_char(s);
}
function close_curly_token(s:stream){
	return close_curly_char(s);
}
function ht_sep_token(s:stream){
	return head_tail_separator_char(s);
}
function comma_token(s:stream){
	return comma_char(s);
}
// function end_token(s:stream){
// 	return end_char(s);
// }
//  An end char shall be followed by a layout character or a  %




// 6.5.3 Solo characters1

function cut_char(s:stream){
	return getWantedChar(s,"!");
}
function open_char(s:stream){
	return getWantedChar(s,"(");
}function close_char(s:stream){
	return getWantedChar(s,")");
}
function comma_char(s:stream){
	return getWantedChar(s,",");
}
function semicolon_char(s:stream){
	return getWantedChar(s,";");
}
function open_list_char(s:stream){
	return getWantedChar(s,"[");
}
function close_list_char(s:stream){
	return getWantedChar(s,"]");
}
function open_curly_char(s:stream){
	return getWantedChar(s,"{");
}
function close_curly_char(s:stream){
	return getWantedChar(s,"}");
}
function head_tail_separator_char(s:stream){
	return getWantedChar(s,"|");
}
function end_line_comment_char(s:stream){
	return getWantedChar(s,"%");
}

// 6.5.4 Layout characters
const layout_char = matchAny([
	space_char,
	horizontal_tab_char,
	new_line_char
]);
function space_char(s: stream) {
	const char = s.text.charAt(s.offset);
	if (char == " ") {
		s.char += 1;
		s.offset += 1;
		return char;
	}
	return undefined;
}
function horizontal_tab_char(s: stream) {
	const char = s.text.charAt(s.offset);
	if (char == "\t") {
		s.char += 1;
		s.offset += 1;
		return char;
	}
	return undefined;
}
function new_line_char(s: stream) {
	return matchAny([
		(s)=>getWantedStr(s,"\r\n"),
		(s)=>getWantedChar(s,"\r"),
		(s)=>getWantedChar(s,"\n")
	])(s);
}
function getWantedStr(s:stream,str:string){
	if (s.text.slice(s.offset,s.offset+str.length)==str){
		streamConsume(s,str);
		return str;
	}
	return undefined;
}



function small_letter_char(s:stream):string | undefined | undefined{
	const char = s.text.charAt(s.offset);
	if ("a"<=char && char <="z"){
		streamConsume(s,char);
		return char;
	}
	return undefined;
}
function zero_or_more(fun:(s: stream) => string | undefined){
	const tmp = function (s:stream):string{
		let str = ""
		for(;;){
            const state0 = getStreamState(s);
            const char1 = fun(s);
            if (char1 == undefined) {
                setStreamState(s, state0);
                return str;
            }
            str +=char1; 
		}
	}
	return tmp;
}


function alphanumeric_char_list(s:stream):string{
	return zero_or_more(alphanumeric_char)(s);
}
function alphanumeric_char(s:stream){
	return matchAny([
		alpha_char,
		decimal_digit_char,
	])(s);
}
function alpha_char(s:stream){
	return matchAny([
		underscore_char,
		letter_char
	])(s);
}

function letter_char(s:stream){
	return matchAny([
		capital_letter_char,
		small_letter_char
	])(s);
}
function capital_letter_char(s:stream){
	const char = s.text.charAt(s.offset);
	if(char>="A" && char<="Z"){
		streamConsume(s,char);
		return char;
	}
	return undefined;
}

function layout_text_sequence(s: stream): string {
	return zero_or_more(layout_text)(s);
}
function layout_text(s: stream) {
	return matchAny([
		layout_char,
		comment
	])(s);
}
function comment(s: stream): string | undefined | undefined {
	return matchAny([
		single_line_comment,
		bracketed_comment
	])(s);
}
function getchar(s: stream) {
	const char = s.text.charAt(s.offset);
	if (char == "") {
		return "";
	}
	if (char == "\n") {
		s.line += 1;
		s.char = 0;
	}
	else {
		s.char += 1;
	}
	s.offset += 1;
	return char;


}

function single_line_comment(s: stream) {
	
	if (s.text[s.offset] != "%") {
		return undefined;
	}
	const state0 = getStreamState(s);
	streamConsume(s,"%");
	const cont = single_line_comment_cont(s);
	return "%" + cont;
}

function bracketed_comment(s: stream) {
	return matchAll([
		(s)=>getWantedStr(s,"/*"),
		bracketed_comment_cont,
		(s)=>getWantedStr(s,"*/"),
	])(s);
}
function bracketed_comment_char(s:stream){
	try {
	const str = s.text.slice(s.offset,s.offset+2);
	if (str=="*/"){
		return undefined;
	}
	const char =str[0];
	streamConsume(s,char);
	return char;
		
	} catch (error) {
		console.log(s.line,s.char);
	}

}
const bracketed_comment_cont= zero_or_more(bracketed_comment_char);
function single_line_comment_cont(s: stream): string {
	let str;
	str = new_line_char(s); if (str != undefined) return str ?? "";
	str = getchar(s);
	if (str != "") {
		return str + single_line_comment_cont(s);
	}
	else {//str==""
		return "";
	}

}
// eslint-disable-next-line @typescript-eslint/no-namespace


function back_quoted_string_token(s:stream){
	return matchAll([
		back_quote_char,
		back_quoted_item_list,
		back_quote_char
	])(s);
}
function token_func_gen(func:((s:stream)=>string|undefined),str:tokenType){
	/**
	 * @type {?token}
	 */
	return function(s:stream):token|undefined{
		const state0=getStreamState(s);
		const [line0,char0]=[s.line,s.char];
		const lay = layout_text_sequence(s);
		const [Line1,char1]=[s.line,s.char];
		const var_tok=func(s);
		if (var_tok==undefined){
			setStreamState(s,state0);
			return undefined;
		}
		const [line2,char2]=[s.line,s.char];
		return {
			layout:lay,
			text:var_tok,
			range:{
				start:{line:Line1,character:char1},
				end:{line:line2,character:char2}
			},
			fullRange:{
				start:{line:line0,character:char0},
				end:{line:line2,character:char2}
			},
			kind:str
		};
		};

	
}
// debug();
