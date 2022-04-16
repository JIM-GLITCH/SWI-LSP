import { integer } from 'vscode-languageserver';
import { ClauseNode, FunctorNode, PrefixOpArgNode,Node, ListNode, IntegerNode, AtomNode } from './astNode'
import { pushError } from './pushDiagnostic'
export { OpTable};

class OpTable{
	builtin_op_table:Map<string, Map<string, number>>;
	userdefined_op_table:Map<string, Map<string, number>>;
	constructor(){
		this.builtin_op_table = init_builtin_op_table();
		this.userdefined_op_table = new Map();
	}

	current_op(str: string, type: string){
		let prec: number | undefined;
		const builtin_op_table = this.builtin_op_table;
		const userdefined_op_table = this.userdefined_op_table;
		if ((prec = builtin_op_table.get(str)?.get(type)))
			return prec;
		if ((prec = userdefined_op_table.get(str)?.get(type)))
			return prec;
		return -1;	
	}

	op(opPrecedence: number, opType: string, opName: string) {
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
	
		// 如果 precedence == 0 表示要废除 这个 operator
		if (opPrecedence == 0) {
			const flag1 = this.builtin_op_table.get(opName)?.delete(opType);
			const flag2 = this.userdefined_op_table.get(opName)?.delete(opType);
			if (flag1 === false && flag2 === false) {
				// TODO pushHint op {opName} doesn't have type {optype}
			}
			if (flag1 === undefined && flag2 === undefined) {
				// TODO pushHint atom {opName} is not a operator 
			}
		}

		else if ( !isNaN(opPrecedence)){
			const opNameMap = this.userdefined_op_table.get(opName);
			const prec = this.userdefined_op_table.get(opName)?.get(opType);
			// 检查operator是否被定义过
			if (prec && prec > 0) {
				// TODO puishWarning has been defined
			}
			// 创建operator
			if (!opNameMap) {
				this.userdefined_op_table.set(opName, new Map([[opType, opPrecedence]]));
			}
			else {
				opNameMap.set(opType, opPrecedence);
			}
		}
		else {
			// TODO pusherror
		}
	}

	tryChangeOpTable(node:ClauseNode){
		const termNode = node.term;
		if (this.topLevelNode(termNode)){
			const argNode = (termNode as PrefixOpArgNode).arg;
			this.tryOpThreeNode(argNode);
			this.tryModuleNode(argNode);
		}
	}
	tryNode(node:Node){
		if(this.opThreeNode(node)){
			const argNodes = (node as FunctorNode).getArgs()
			if((argNodes.length !=3))
				return;
			if(argNodes[0].kind != Kind.IntegerNode || argNodes[1].kind != Kind.AtomNode || argNodes[2].kind !=Kind.AtomNode){
				return;
			}
			const args = argNodes.map(x=>(x as IntegerNode|AtomNode).functor.text);
			const prec = Number(args[0]);
			// 如果是单引号 括起来的 去掉单引号
			const type = this.trimSingleQuote(args[1]);
			const name = this.trimSingleQuote(args[2]);
			if(isNaN(prec))
				return pushError(argNodes[0].range,`Domain error: 'operator_priority' expected, found ${prec}}`)
			//  如果Procedence <0 || opPrecedence >1200 报错
			if (prec < 0 || prec > 1200) {
				return pushError(argNodes[0].range,`Domain error: 'operator_priority' expected, found ${prec}}`)
			}
				// optype 符合规范
			if (!opTypeSet.has(type)){
				return pushError(argNodes[1].range,`Domain error: 'operator_specifier' expected, found ${type}`)
			}
			return this.op(prec,type,name);
		}else if (this.moduleTwoThreeNode(node)){
			const moduleNode =  node as FunctorNode;
			const publicListNode = moduleNode.args._nodes[1];
			if (! (publicListNode instanceof ListNode))
				return;
			const publicList = publicListNode.getArgs();
			return publicList.forEach(x=>this.tryOpThreeNode(x));
		}
	}
	/**`op(opPrec,opKind,opName)` modify op table */
	tryOpThreeNode(node:Node) {
		if(this.opThreeNode(node)){
			const argNodes = (node as FunctorNode).getArgs()
			if((argNodes.length !=3))
				return;
			if(argNodes[0].kind != Kind.IntegerNode || argNodes[1].kind != Kind.AtomNode || argNodes[2].kind !=Kind.AtomNode){
				return;
			}
			const args = argNodes.map(x=>(x as IntegerNode|AtomNode).functor.text);
			const prec = Number(args[0]);
			// 如果是单引号 括起来的 去掉单引号
			const type = this.trimSingleQuote(args[1]);
			const name = this.trimSingleQuote(args[2]);
			if(isNaN(prec))
				return pushError(argNodes[0].range,`Domain error: 'operator_priority' expected, found ${prec}}`)
			//  如果Procedence <0 || opPrecedence >1200 报错
			if (prec < 0 || prec > 1200) {
				return pushError(argNodes[0].range,`Domain error: 'operator_priority' expected, found ${prec}}`)
			}
				// optype 符合规范
			if (!opTypeSet.has(type)){
				return pushError(argNodes[1].range,`Domain error: 'operator_specifier' expected, found ${type}`)
			}
			return this.op(prec,type,name);
		}
	}
		
	/**check if `module/2` `module/3` modify op table */
	tryModuleNode(node:Node){
		if (!this.moduleTwoThreeNode(node))
			return;
		const moduleNode =  node as FunctorNode;
		const publicListNode = moduleNode.args._nodes[1];
		if (! (publicListNode instanceof ListNode))
			return;
		const publicList = publicListNode.getArgs();
		publicList.forEach(x=>this.tryOpThreeNode(x));
	}
	
	moduleTwoThreeNode(node:Node) {
		return (node instanceof FunctorNode && node.functor.text == "module" && (node.arity==2 || node.arity==3 ));
	}
	trimSingleQuote(opName:string) {
		if (opName[0]=="'" && opName[opName.length-1]=="'"){
			return opName.slice(1,-1);
		}
		return opName;
	}
	
	topLevelNode(termNode:Node|undefined){
		return (termNode instanceof PrefixOpArgNode && termNode.functor.text==":-")
	}
	opThreeNode(argNode:Node|undefined){
		return (argNode instanceof FunctorNode && argNode.functor.text == "op" && argNode.arity==3)
	}
}

// function current_op(str: string, type: string) {
// 	let prec: number | undefined;
// 	if ((prec = builtin_op_table.get(str)?.get(type)))
// 		return prec;
// 	if ((prec = userdefined_op_table.get(str)?.get(type)))
// 		return prec;
// 	return -1;
// }

const init_builtin_op_table :()=>Map<string, Map<string, integer>> = ()=> new Map([
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

// const userdefined_op_table: Map<string, Map<string, integer>> = new Map();
// function op(opPrecedence: number, opType: string, opName: string) {

// 	// 	It is not allowed to redefine the comma (',').
// 	// The bar (|) can only be (re-)defined as infix operator with priority not less than 1001.
// 	// It is not allowed to define the empty list ([]) or the curly-bracket pair ({}) as operators.
// 	switch (opName) {
// 		case ",":
// 		case "|":
// 		case "[]":
// 		case "{}":
// 		case undefined:
// 			// TODO pushError No permission to modify operator `',''
// 			return;
// 		default:
// 			break;
// 	}

// 	// 如果 precedence == 0 表示要废除 这个 operator
// 	if (opPrecedence == 0) {
// 		const flag1 = builtin_op_table.get(opName)?.delete(opType);
// 		const flag2 = userdefined_op_table.get(opName)?.delete(opType);
// 		if (flag1 === false && flag2 === false) {
// 			// TODO pushHint op {opName} doesn't have type {optype}
// 		}
// 		if (flag1 === undefined && flag2 === undefined) {
// 			// TODO pushHint atom {opName} is not a operator 
// 		}
// 	}
// 		//  如果Procedence <0 || opPrecedence >1200 报错
// 	else if (opPrecedence < 0 || opPrecedence > 1200) {
// 		// TODO pushError Domain error: `operator_priority' expected, found {opPrecedence}
// 	}
// 	else if ( !isNaN(opPrecedence)){
// 		const opNameMap = userdefined_op_table.get(opName);
// 		const prec = userdefined_op_table.get(opName)?.get(opType);
// 		// 检查operator是否被定义过
// 		if (prec && prec > 0) {
// 			// TODO puishWarning has been defined
// 		}
// 		// 创建operator
// 		if (!opNameMap) {
// 			userdefined_op_table.set(opName, new Map([[opType, opPrecedence]]));
// 		}
// 		else {
// 			opNameMap.set(opType, opPrecedence);
// 		}
// 	}
// 	else {
// 		// TODO pusherror
// 	}
// }
// /** check if `op/3` `module/2`or `module/3` modify op table */
// function tryChangeOpTable(node:ClauseNode){
// 	const termNode = node.term;
// 	if (topLevelNode(termNode)){
// 		const argNode = (termNode as PrefixOpArgNode).arg;
// 		tryOpThreeNode(argNode);
// 		tryModuleNode(argNode);
// 	}
// }
// function tryOpThreeNode(node:Node) {
// 	if(opThreeNode(node)){
// 		const args = (node as FunctorNode).getArgs().map(x=>x.functor.text);
// 		if(!(args.length ==3))
// 			return;
// 		const prec = Number(args[0]);
// 		// 如果是单引号 括起来的 去掉单引号
// 		const type = trimSingleQuote(args[1]);
// 		const name = trimSingleQuote(args[2]);
// 		if(isNaN(prec))
// 			// TODO pushError 
// 			return;
// 			// optype 符合规范
// 		if (!opTypeSet.has(type)){
// 			// TODO pushError 
// 			return;
// 		}
// 		op(prec,type,name);
// 	}
// }
	
// /**check if `module/2` `module/3` modify op table */
// function tryModuleNode(node:Node){
// 	if (!moduleTwoThreeNode(node))
// 		return;
// 	const moduleNode =  node as FunctorNode;
// 	const publicListNode = (moduleNode.restArgs as ListNode).left;
// 	if (! (publicListNode instanceof ListNode))
// 		return;
// 	const publicList = publicListNode.getArgs();
// 	publicList.forEach(x=>tryOpThreeNode(x));
// }

// function moduleTwoThreeNode(node:Node) {
// 	return (node instanceof FunctorNode && node.functor.text == "module" && (node.arity==2 || node.arity==3 ));
// }
// function trimSingleQuote(opName:string) {
// 	if (opName[0]=="'" && opName[opName.length-1]=="'"){
// 		return opName.slice(1,-1);
// 	}
// 	return opName;
// }

// function topLevelNode(termNode:Node|undefined){
// 	return (termNode instanceof PrefixOpArgNode && termNode.functor.text==":-")
// }
// function opThreeNode(argNode:Node|undefined){
// 	return (argNode instanceof FunctorNode && argNode.functor.text == "op" && argNode.arity==3)
// }