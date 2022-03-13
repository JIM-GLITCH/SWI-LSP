import { integer } from 'vscode-languageserver';
export {current_op};
/**
 * 
 * @param str op name
 * @param type op type
 * @returns op precedence
 */
function current_op(str: string, type: string) {
	let prec:number|undefined;
	if (( prec = builtin_op_table.get(str)?.get(type) ))
			return prec;
	if (( prec = userdefined_op_table.get(str)?.get(type) ))
			return prec;
	return -1;
}

const  builtin_op_table:Map<string,Map<string,integer>> = new Map([
	["|",new Map([["xfy",1150]])],   
	["$",new Map([["fx",1]])],
	["*",new Map([["yfx",400]])],
	["**",new Map([["xfx",200]])],
	["*->",new Map([["xfy",1050]])],       
	["+",new Map([["yfx",500],["fy",200]])],
	[",",new Map([["xfy",1000]])],
	["-",new Map([["yfx",500],["fy",200]])],
	["-->",new Map([["xfx",1200]])],       
	["->",new Map([["xfy",1050]])],
	[".",new Map([["yfx",100]])],
	["/",new Map([["yfx",400]])],
	["//",new Map([["yfx",400]])],
	["/\\",new Map([["yfx",500]])],
	[":",new Map([["xfy",600]])],
	[":-",new Map([["xfx",1200],["fx",1200]])],
	[":<",new Map([["xfx",700]])],
	[":=",new Map([["xfy",990]])],
	[";",new Map([["xfy",1100]])],
	["<",new Map([["xfx",700]])],
	["<<",new Map([["yfx",400]])],
	["=",new Map([["xfx",700]])],
	["=..",new Map([["xfx",700]])],
	["=:=",new Map([["xfx",700]])],
	["=<",new Map([["xfx",700]])],
	["==",new Map([["xfx",700]])],
	["=>",new  Map([["xfx",1200]])],
	["=@=",new Map([["xfx",700]])],
	["=\\=",new Map([["xfx",700]])],
	[">",new Map([["xfx",700]])],
	[">:<",new Map([["xfx",700]])],
	[">=",new Map([["xfx",700]])],
	[">>",new Map([["yfx",400]])],
	["?",new Map([["fx",500]])],
	["@<",new Map([["xfx",700]])],
	["@=<",new Map([["xfx",700]])],
	["@>",new Map([["xfx",700]])],
	["@>=",new Map([["xfx",700]])],
	["\\",new Map([["fy",200]])],
	["\\+",new Map([["fy",900]])],
	["\\/",new Map([["yfx",500]])],
	["\\=",new Map([["xfx",700]])],
	["\\==",new Map([["xfx",700]])],
	["\\=@=",new Map([["xfx",700]])],
	["^",new Map([["xfy",200]])],
	["as",new Map([["xfx",700]])],
	["discontiguous",new Map([["fx",1150]])],
	["div",new Map([["yfx",400]])],
	["dynamic",new Map([["fx",1150]])],
	["initialization",new Map([["fx",1150]])],
	["is",new Map([["xfx",700]])],
	["meta_predicate",new Map([["fx",1150]])],
	["mod",new Map([["yfx",400]])],
	["module_transparent",new Map([["fx",1150]])],
	["multifile",new Map([["fx",1150]])],
	["rdiv",new Map([["yfx",400]])],
	["rem",new Map([["yfx",400]])],
	["public",new Map([["fx",1150]])],
	["thread_initialization",new Map([["fx",1150]])],
	["thread_local",new Map([["fx",1150]])],
	["volatile",new Map([["fx",1150]])],
	["xor",new Map([["yfx",500]])]
]);

const  userdefined_op_table:Map<string,Map<string,integer>> = new Map();