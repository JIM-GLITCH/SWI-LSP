
import { AnalyseCtx, CstNode } from './cst2'
import { error } from "./pushDiagnostic"
import { isAtom, isInteger, isList } from './utils'
export { optable }
class optable {
	default_table = default_table;
	user_table = new Map<string, Map<string, number>>()
	constructor() {
	}
	current_op(str: string, type: string): number | undefined {
		let prec: number | undefined
		const builtin_op_table = this.default_table
		const userdefined_op_table = this.user_table
		if ((prec = builtin_op_table.get(str)?.get(type)))
			return prec
		if ((prec = userdefined_op_table.get(str)?.get(type)))
			return prec
		return undefined
	}
	op_3(prec: number, type: string, name: string, ctx: AnalyseCtx) {
		switch (name) {
			case ",":
			case "|":
			case "[]":
			case "{}":
				error(ctx.clause.getRange(), `syntaxerror  No permission to modify operator ${name}`, ctx)
			default:
				break
		}
		// if prec ==0 表示要废除这个op
		if (prec == 0) {
			let r = this.default_table.get(name)?.delete(type)
			let r2 = this.user_table.get(name)?.delete(type)
			if (!r && !r2) {
				//TODO no such op
			}
			return
		}
		if (prec > 0) {
			let opMap = this.user_table.get(name)
			if (!opMap) {
				opMap = new Map()
				this.user_table.set(name, opMap)
			}
			opMap.set(type, prec)
			return
		}
	}
	op(precNode: CstNode, typeNode: CstNode, nameNode: CstNode, ctx: AnalyseCtx) {
		let tmp = {}
		if (!check(precNode, typeNode, nameNode, tmp, ctx)) {
			return
		}
		let { name, type, prec } = tmp
		this.op_3(prec, type, name, ctx)

	}
	absorb(otherTable: optable, ctx: AnalyseCtx) {
		const otherOpsMap = otherTable.user_table
		otherOpsMap.forEach((type_prec, name) => {
			type_prec.forEach((prec, type) => {
				this.op_3(prec, type, name, ctx)
			})
		})
	}
}
const default_table: Map<string, Map<string, number>> = new Map([
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
])
const opTypeSet = new Set(["fx"
	, "fy"
	, "xf"
	, "yf"
	, "xfy"
	, "yfx"
	, "xfx"])
interface tmp {
	prec: number
	type: string
	name: string
}
function check(precNode: CstNode, typeNode: CstNode, nameNode: CstNode, tmp: any, ctx: AnalyseCtx): tmp is tmp {
	let prec = Number(precNode.value)
	if (!isInteger(precNode) || prec > 1200 || prec < 0) {
		error(precNode.getRange(), ` Type error: \`integer' expected between 0 and 1200`, ctx)
		return false
	}
	tmp.prec = prec

	let type = typeNode.value
	if (!isAtom(typeNode) || !(opTypeSet.has(type))) {
		error(typeNode.getRange(), ` Type error: \`atom' expected "fx" "fy" "xf" "yf" "xfy" "yfx" "xfx" `, ctx)
		return false
	}
	tmp.type = type

	if (isAtom(nameNode)) {
		let name = nameNode.value
		tmp.name = name
		return true
	}
	return false
}
