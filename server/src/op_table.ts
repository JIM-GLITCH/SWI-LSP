import { integer } from 'vscode-languageserver';
export { current_op, op };
/**
 * 
 * @param str op name
 * @param type op type
 * @returns op precedence
 */
function current_op(str: string, type: string) {
	let prec: number | undefined;
	if ((prec = builtin_op_table.get(str)?.get(type)))
		return prec;
	if ((prec = userdefined_op_table.get(str)?.get(type)))
		return prec;
	return -1;
}

const builtin_op_table: Map<string, Map<string, integer>> = new Map([
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
]);
const opTypeSet = new Set(["fx"
	, "fy"
	, "xf"
	, "yf"
	, "xfy"
	, "yfx"
	, "xfx"]);
const userdefined_op_table: Map<string, Map<string, integer>> = new Map();
function op(opPrecedence: number, opType: string, opName: string) {
	// 如果是单引号 括起来的 去掉单引号
	if (opName[0]=="'" && opName[opName.length-1]=="'"){
		opName = opName.slice(1,-1);
	}
	// 	It is not allowed to redefine the comma (',').
	// The bar (|) can only be (re-)defined as infix operator with priority not less than 1001.
	// It is not allowed to define the empty list ([]) or the curly-bracket pair ({}) as operators.
	switch (opName) {
		case ",":
		case "|":
		case "[]":
		case "{}":
		case undefined:
			// TODO pushError No permission to modify operator `',''
			return;
		default:
			break;
	}
	// optype 符合规范
	if (!opTypeSet.has(opType)){
		// TODO pushError `',''
		return;
	}
	// 如果 precedence == 0 表示要废除 这个 operator
	if (opPrecedence == 0) {
		const flag1 = builtin_op_table.get(opName)?.delete(opType);
		const flag2 = userdefined_op_table.get(opName)?.delete(opType);
		if (flag1 === false && flag2 === false) {
			// TODO pushHint op {opName} doesn't have type {optype}
		}
		if (flag1 === undefined && flag2 === undefined) {
			// TODO pushHint atom {opName} is not a operator 
		}
	}
		//  如果Procedence <0 || opPrecedence >1200 报错
	else if (opPrecedence < 0 || opPrecedence > 1200) {
		// TODO pushError Domain error: `operator_priority' expected, found {opPrecedence}
	}
	else if ( !isNaN(opPrecedence)){
		const opNameMap = userdefined_op_table.get(opName);
		const prec = userdefined_op_table.get(opName)?.get(opType);
		// 检查operator是否被定义过
		if (prec && prec > 0) {
			// TODO puishWarning has been defined
		}
		// 创建operator
		if (!opNameMap) {
			userdefined_op_table.set(opName, new Map([[opType, opPrecedence]]));
		}
		else {
			opNameMap.set(opType, opPrecedence);
		}
	}
	else {
		// TODO pusherror
	}
}