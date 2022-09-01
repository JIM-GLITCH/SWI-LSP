export{optable}
class optable{
	default_table=default_table;
	user_table=new Map()
	constructor(){
	}
	current_op(str: string, type: string): number|undefined{
		let prec: number | undefined;
		const builtin_op_table = this.default_table;
		const userdefined_op_table = this.user_table;
		if ((prec = builtin_op_table.get(str)?.get(type)))
			return prec;
		if ((prec = userdefined_op_table.get(str)?.get(type)))
			return prec;
		return undefined;	
	}
	op(prec:number,type:string,name:string){
		switch (name){
			case ",":
			case "|":
			case "[]":
			case "{}":
				//syntaxerror  No permission to modify operator `',''
			default:
				break;
		}
		// if prec ==0 表示要废除这个op
		if(prec==0){
			let r = this.default_table.get(name)?.delete(type);
			let  r2 = this.user_table.get(name)?.delete(type);
			if(!r &&!r2){
				//TODO no such op
			}
			return;
		}
		if(prec>0){
			let opMap =this.user_table.get(name);
			if(!opMap){
				opMap=new Map()
				this.user_table.set(name,opMap);
			}
			opMap.set(type,prec);
			return 
		}
	}
}
const default_table :Map<string, Map<string, number>> =new Map([
	["|", new Map([["xfy", 1150]])],
	["$", new Map([["fx", 1]])],
	["*", new Map([["yfx", 400]])],
	["**", new Map([["xfx", 200]])],
	["*->", new Map([["xfy", 1050]])],
	["+", new Map([["yfx", 500], ["fy", 200]])],
	[",", new Map([["xfy", 1000]])],
	["-", new Map([["yfx", 500], ["fy", 200]])],
	["-->", new Map([["xfx", 1200]])],
	["->", new Map([["xfy", 1050]])],
	[".", new Map([["yfx", 100]])],
	["/", new Map([["yfx", 400]])],
	["//", new Map([["yfx", 400]])],
	["/\\", new Map([["yfx", 500]])],
	[":", new Map([["xfy", 600]])],
	[":-", new Map([["xfx", 1200], ["fx", 1200]])],
	[":<", new Map([["xfx", 700]])],
	[":=", new Map([["xfy", 990]])],
	[";", new Map([["xfy", 1100]])],
	["<", new Map([["xfx", 700]])],
	["<<", new Map([["yfx", 400]])],
	["=", new Map([["xfx", 700]])],
	["=..", new Map([["xfx", 700]])],
	["=:=", new Map([["xfx", 700]])],
	["=<", new Map([["xfx", 700]])],
	["==", new Map([["xfx", 700]])],
	["=>", new Map([["xfx", 1200]])],
	["=@=", new Map([["xfx", 700]])],
	["=\\=", new Map([["xfx", 700]])],
	[">", new Map([["xfx", 700]])],
	[">:<", new Map([["xfx", 700]])],
	[">=", new Map([["xfx", 700]])],
	[">>", new Map([["yfx", 400]])],
	["?", new Map([["fx", 500]])],
	["@<", new Map([["xfx", 700]])],
	["@=<", new Map([["xfx", 700]])],
	["@>", new Map([["xfx", 700]])],
	["@>=", new Map([["xfx", 700]])],
	["\\", new Map([["fy", 200]])],
	["\\+", new Map([["fy", 900]])],
	["\\/", new Map([["yfx", 500]])],
	["\\=", new Map([["xfx", 700]])],
	["\\==", new Map([["xfx", 700]])],
	["\\=@=", new Map([["xfx", 700]])],
	["^", new Map([["xfy", 200]])],
	["as", new Map([["xfx", 700]])],
	["discontiguous", new Map([["fx", 1150]])],
	["div", new Map([["yfx", 400]])],
	["dynamic", new Map([["fx", 1150]])],
	["initialization", new Map([["fx", 1150]])],
	["is", new Map([["xfx", 700]])],
	["meta_predicate", new Map([["fx", 1150]])],
	["mod", new Map([["yfx", 400]])],
	["module_transparent", new Map([["fx", 1150]])],
	["multifile", new Map([["fx", 1150]])],
	["rdiv", new Map([["yfx", 400]])],
	["rem", new Map([["yfx", 400]])],
	["public", new Map([["fx", 1150]])],
	["thread_initialization", new Map([["fx", 1150]])],
	["thread_local", new Map([["fx", 1150]])],
	["volatile", new Map([["fx", 1150]])],
	["xor", new Map([["yfx", 500]])]
]) ;
const opTypeSet = new Set(["fx"
	, "fy"
	, "xf"
	, "yf"
	, "xfy"
	, "yfx"
	, "xfx"]);