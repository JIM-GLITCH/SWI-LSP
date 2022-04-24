
import { SSL_OP_NO_TLSv1_2 } from 'constants'
import { Agent } from 'https'
import { Position, Range } from 'vscode-languageserver'
import { FileState } from './fileState'
import { Graph } from './graph'
import { token, tokenType } from './lexer'
import { pushError } from './pushDiagnostic'
export {
	Node,
	VarNode,
	NegativeNode,
	FunctorNode,
	AtomNode,
	ListNode,
	ParenNode,
	StringNode,
	CurlyNode,
	BackQuotedNode,
	InfixopToken as InfixopToken,
	PostfixopToken as PostfixopToken,
	InfixOpArgNode,
	CommaNode,
	SemicolonNode,
	PostfixOpArgNode,
	PrefixOpArgNode,
	ClauseNode,
	IntegerNode,
	Semantic,
	DictNode
}

function combineRange(r1: Range, r2: Range): Range {
	return { start: r1.start, end: r2.end }
}

const enum Semantic {
	TopLevel = 1,
	DCG,
	RuleHead,
	DCGHead,
	RuleBody,
	DCGBody,
	Arg,
	RuleEval
}
interface Info{
	callerName?:string

}
class Node {
	walk(level: number, state: FileState,info:Info) { };
	range!: Range
	fullRange!: Range
	kind!: Kind
	functor: token | undefined
	name!: string
	arity?: number
	constructor(start: { range: Range, fullRange: Range }, end?: { range: Range, fullRange: Range }) {
		if (end === undefined && start !== undefined) {
			this.range = start.range
			this.fullRange = start.fullRange
		}
		else if (start === undefined && end !== undefined) {
			this.range = end.range
			this.fullRange = end.fullRange
		}
		else if (start !== undefined && end !== undefined) {
			this.range = combineRange(start.range, end.range)
			this.fullRange = combineRange(start.fullRange, end.fullRange)
		}
	}
	search(pos: Position): Node | undefined {
		return
	}
}
class VarNode extends Node {
	kind = Kind.VarNode;
	functor
	name:string
	constructor(vartoken: token) {
		super(vartoken)
		this.functor = vartoken
		this.name = this.functor.text
	}
	search(pos: Position): Node | undefined {
		return checTokenRange(pos,this.functor)
		? this
		: undefined
	}
}

class NegativeNode extends Node {
	// TODO strange here? negativeNode has two token?
	kind = Kind.NegativeNode;
	sign: token
	number: token
	constructor({ sign, integer }: { sign: token; integer: token }) {
		super(sign, integer)
		this.sign = sign
		this.number = integer
	}
	search(pos: Position): Node | undefined {
		if (checTokenRange(pos, this.sign)
			|| checTokenRange(pos, this.number)) {
			return this
		}
	}

}

class FunctorNode extends Node {
	kind = Kind.FunctorNode;
	functor: token
	// open: token;
	// close: token;
	args:Args
	arity: number
	constructor(functor: token, nodes: Node[],close:token) {
		super(functor, close)
		this.functor = functor
		this.args=new Args(nodes)
		this.arity = nodes.length
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos, this, undefined,this.args)
	}
	getArgs() {
		return this.args._nodes
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel: {
				/* a(xxx). */
				this.name = this.functor.text + "/" + this.arity
				state.graph.addDefinition(this.name, this)
				return this.args?.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleHead: {
				/* a(xxx) :- xxx. */
				this.name = this.functor.text + "/" + this.arity
				state.graph.addDefinition(this.name, this)
				info.callerName = this.name
				return this.args?.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleBody: {
				/* xxx :- a(xxx). */
				this.name = this.functor.text + "/" + this.arity
				state.graph.addReference(this.name, this)
				state.graph.addCall(this.name,info.callerName,this)
				return this.args?.walk(Semantic.Arg,state,info)
			}
			case Semantic.DCGHead: {
				/* a(xxx) --> xxx. */
				this.name = this.functor.text + "/" + (this.arity + 2)
				info.callerName = this.name
				state.graph.addDefinition(this.name, this)
				return this.args?.walk(Semantic.Arg,state,info)
			}
			case Semantic.DCGBody: {
				/*xxx --> a(xxx). */
				this.name = this.functor.text + "/" + (this.arity + 2)
				state.graph.addReference(this.name, this)
				state.graph.addCall(this.name,info.callerName,this)
				return this.args?.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleEval: {
				/*:- a(xxx). */
				state.opTable.tryNode(this)
				this.name = this.functor.text + "/" + this.arity
				state.graph.addReference(this.name, this)
				return this.args?.walk(Semantic.Arg,state,info)
			}
			case Semantic.Arg: {
				/**xxx(a) */
				this.name = this.functor.text + "/" + this.arity
				state.graph.addReference(this.name, this)
				return this.args?.walk(Semantic.Arg,state,info)
			}
			default:
				break
		}
	}

}
class IntegerNode extends Node {
	kind = Kind.IntegerNode;
	functor: token
	name :string
	constructor(head: token, tail?: token) {
		super(head, tail)
		this.functor = head
		this.name = this.functor.text
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos, this)
	}
}

class AtomNode extends Node {
	kind = Kind.AtomNode;
	functor: token
	constructor(head: token, tail?: token) {
		super(head, tail)
		this.functor = head
		this.name = trimSingleQuote(this.functor.text);
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel: {
				/* a.  addDefinition */
				return state.graph.addDefinition(this.name, this)
			}
			case Semantic.RuleHead: {
				/*  a :- xxx.   addDefinition */
				info.callerName = this.name
				return state.graph.addDefinition(this.name, this)
			}
			case Semantic.RuleBody: {
				/*  xxx :- a.  addReference*/
				return state.graph.addReference(this.name, this)
			}
			case Semantic.DCGHead: {
				/* a -> xxx. addDefinition */
				this.name += "/2"
				info.callerName = this.name
				return state.graph.addDefinition(this.name, this)
			}
			case Semantic.DCGBody: {
				/* xxx --> a.  addReference*/
				this.name +="/2"
				return state.graph.addReference(this.name, this)
			}
			case Semantic.Arg: {
				/*  xxx --> a.  addReference*/
				return state.graph.addReference(this.name, this)
			}
			default:
				break
		}
	}
	search(pos: Position): Node | undefined {
		return checkFunctorRange(pos,this)
	}
}
class StringNode extends Node {
	kind = Kind.StringNode;
	functor: token
	name: string
	constructor(string: token) {
		super(string)
		this.functor = string
		this.name = this.functor.text;
	}
}
class BackQuotedNode extends Node {
	kind = Kind.BackQuotedNode;
	functor: token
	constructor(back_quoted_string: token) {
		super(back_quoted_string)
		this.functor = back_quoted_string
	}
}

class ListNode extends Node {
	kind = Kind.ListNode;
	// openList: token;
	// closeList: token;
	functor:token
	left: ArgNode
	right: ListNode|ArgNode|undefined
	length: number
	name = "'[|]'/2"
	//       [OpenList,Arg1,RestArgs]
	constructor(left: ArgNode, commaToken:token,right: ListNode|ArgNode) {
		super(left, right)
		this.left = left
		this.right = right
		this.functor = commaToken
		if (right instanceof ListNode) {
			this.length = 1+ right.length
		} else {
			this.length = 1
		}
	}
	getArgs() {
		const args = [this.left]
		let p = this.right
		for (; ;) {
			if (p instanceof ListNode) {
				args.push(p.left)
				p = p.right
				continue
			}
			else if (p instanceof AtomNode) {
				break
			}
		}
		return args
	}
	walk(level: number, state: FileState,info:Info): void {
		/* only Sematic.Arg */
		this.left.walk(Semantic.Arg,state,info)
		return this.right?.walk(Semantic.Arg,state,info)	
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos,this,this.left,this.right)
	}
}

class ParenNode extends Node {
	kind = Kind.ParenNode;
	open: token
	close: token
	term: any
	constructor(ts: any) {
		super(ts)
		this.open = ts[0]
		this.close = ts[2]
		this.term = ts[1]
	}
}
class CurlyNode extends Node {
	// openCurly: token;
	// closeCurly: token;
	functor:token
	arg: ArgNode
	name = "{}/1"
	constructor(openCurly: token, arg: any, closeCurly: token) {
		super(openCurly, closeCurly)
		// this.openCurly = ts[0];
		// this.closeCurly = ts[2];
		this.arg = arg
		this.functor = openCurly
	}
	walk(level: number, state: FileState,info:Info): void {

		switch (level) {
			case Semantic.TopLevel: {
				/**{xxx}. */
				state.graph.addDefinition("{}/1", this)
				return this.arg.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleHead: {
				/**{xxx}:-xxx. */
				state.graph.addDefinition("{}/1", this)
				info.callerName = this.name
				return this.arg.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleBody: {
				/**xxx:-{xxx} */
				state.graph.addReference("{}/1", this)
				return this.arg.walk(Semantic.Arg,state,info)
			}
			case Semantic.DCGHead: {
				/**{xxx}-->xxx. */
				info.callerName = this.name
				return pushError(this.range, "No permission to define dcg_nonterminal `{xxx}'")
			}
			case Semantic.DCGBody: {
				/**xxx-->{xxx} */
				return this.arg.walk(Semantic.RuleBody, state,info)
			}
			case Semantic.RuleEval: {
				/** :- {xxx} */
				state.graph.addReference("{}/1", this)
				return this.arg.walk(Semantic.Arg,state,info)
			}
			case Semantic.Arg: {
				state.graph.addReference("{}/1", this)
				return this.arg.walk(Semantic.Arg,state,info)
			}
			default:
				break
		}
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos,this,undefined,this.arg)
	}
}

class opToken implements token {
	// token interface
	layout: string
	text: string
	range: Range
	fullRange: Range
	kind: tokenType
	next?: any
	constructor(atom: token) {
		// token interface
		this.layout = atom.layout
		this.text = atom.text
		this.range = atom.range
		this.fullRange = atom.fullRange
		this.kind = atom.kind
		this.next = atom.next
	}
}

class InfixopToken extends opToken {
	kind = Kind.InfixopNode;
	// InfixNode
	precs: [number, number, number]

	constructor(atom: token, precs: [number, number, number]) {
		// token interface
		super(atom)
		// InfixNode
		this.precs = precs

	}
}
class PostfixopToken extends opToken {
	kind = Kind.PostfixopNode;
	// PostfixopNode
	precs: [number, number]

	constructor(atom: token, precs: [number, number]) {
		// token interface
		super(atom)
		// PostfixopNode
		this.precs = precs
	}
}
class InfixOpArgNode extends Node {
	kind = Kind.InfixOpArgNode;
	functor: token
	left: ArgNode
	right: Node
	constructor(Term: FunctorNode | AtomNode, Op: any, Other: Node) {
		super(Term, Other)
		this.functor = Op
		this.left = Term
		this.right = Other
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel: {
				if (this.functor.text === ":-") {
					/** xxx :- xxx. */
					this.left.walk(Semantic.RuleHead, state,info)
					return this.right.walk(Semantic.RuleBody, state,info)
				}
				else if (this.functor.text === "-->") {
					/**xxx --> xxx. */
					this.left.walk(Semantic.DCGHead, state,info)
					return this.right.walk(Semantic.DCGBody, state, info)
				}
				/**xxx a xxx. */
 				this.name = this.functor.text + "/2"
				state.graph.addDefinition(this.name, this)
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleHead: {
				/**xxx a xxx :- xxx. */
				this.name = this.functor.text + "/2"
				info.callerName = this.name
				state.graph.addDefinition(this.name, this)
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleBody: {
				/** xxx :- xxx a xxx. */
				this.name = this.functor.text + "/2"
				state.graph.addReference(this.name, this)
				state.graph.addCall(this.name,info.callerName,this)
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			case Semantic.DCGHead: {
				/**xxx a xxx --> xxx. */
				this.name = this.functor.text + "/4"
				info.callerName = this.name
				state.graph.addDefinition(this.name, this)
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			case Semantic.DCGBody: {
				/**xxx --> xxx a xxx. */
				this.name = this.functor.text + "/4"
				state.graph.addReference(this.name, this)
				state.graph.addCall(this.name,info.callerName,this)
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			case Semantic.RuleEval: {
				/**:- xxx a xxx. */
				this.name = this.functor.text + "/2"
				state.graph.addReference(this.name, this)
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			case Semantic.Arg: {
				this.name = this.functor.text + "/2"
				state.graph.addReference(this.name, this) 
				this.left.walk(Semantic.Arg,state,info)
				return this.right.walk(Semantic.Arg,state,info)
			}
			default:
				break
		}
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos, this, this.left, this.right)
	}
}
class CommaNode extends Node {
	kind = Kind.CommaNode;
	// comma: token;
	left: ArgNode
	right: ArgNode
	functor:token
	name =",/2"
	constructor(Term: any, commaToken:token, Next: any) {
		super(Term, Next)
		// this.comma = tks[0];
		this.left = Term
		this.right = Next
		this.functor = commaToken
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel: {
				/**xxx , xxx. */
				return pushError(this.range, "Cannot redefine ,/2")
			}
			case Semantic.RuleHead: {
				/**xxx , xxx :- xxx. */
				return pushError(this.range, "No permission to modify static procedure ,/2")
			}
			case Semantic.RuleBody: {
				/**xxx:- xxx, xxx. */
				this.left.walk(Semantic.RuleBody, state,info)
				return this.right.walk(Semantic.RuleBody, state,info)
			}
			case Semantic.DCGHead: {
				/**xxx,xxx --> xxx. */
				this.left.walk(Semantic.DCGHead, state,info)
				return this.right.walk(Semantic.DCGBody, state,info)

			}
			case Semantic.DCGBody: {
				/**xxx --> xxx,xxx. */
				this.left.walk(Semantic.DCGBody, state,info)
				return this.right.walk(Semantic.DCGBody, state,info)
			}
			case Semantic.RuleEval: {
				/**:- xxx,xxx. */
				this.left.walk(Semantic.RuleEval, state,info)
				return this.right.walk(Semantic.RuleEval, state,info)

			}
			case Semantic.Arg: {
				this.left.walk(Semantic.Arg, state,info)
				return this.right.walk(Semantic.Arg, state,info)
			}
			default:
				break
		}
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos,this,this.left,this.right);
	}
}

class SemicolonNode extends Node {
	kind = Kind.SemicolonNode;
	// semicolon: token;
	left: ArgNode
	functor: token
	right: ArgNode
	name = ";/2"
	constructor(Term: any, functor: token, Next: any) {
		super(Term, Next)
		// this.semicolon = tks[0];
		this.functor = functor
		this.left = Term
		this.right = Next
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel: {
				return pushError(this.range, "No permission to modify static procedure `(;)/2'")
			}
			case Semantic.RuleHead: {
				return pushError(this.range, "No permission to modify static procedure `(;)/2'")
			}
			case Semantic.RuleBody: {
				this.left.walk(Semantic.RuleBody, state,info)
				return this.right.walk(Semantic.RuleBody, state,info)
			}
			case Semantic.DCGHead: {
				return pushError(this.range, "No permission to define dcg_nonterminal `Semicolon'")
			}
			case Semantic.DCGBody: {
				this.left.walk(Semantic.DCGBody, state,info)
				return this.right.walk(Semantic.DCGBody, state,info)
			}
			case Semantic.RuleEval: {
				this.left.walk(Semantic.RuleEval, state,info)
				return this.right.walk(Semantic.RuleEval, state,info)

			}
			case Semantic.Arg: {
			}
			default:
				break
		}
	}
}
class PostfixOpArgNode extends Node {
	kind = Kind.PostfixOpArgNode;
	functor: token
	arg: ArgNode
	arity = 1
	constructor(Op: any, Term: any) {
		super(Term, Op)
		this.functor = Op
		this.arg = Term
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos, this, this.arg)
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel:
				/**xxx a.  addDefinition*/
				this.name = this.functor.text + "/1"
				state.graph.addDefinition(this.name, this)
				return this.arg.walk(Semantic.Arg, state,info)

			case Semantic.RuleHead:
				/**xxx a :- xxx. addDefinition*/
				this.name = this.functor.text + "/1"
				info.callerName = this.name
				state.graph.addDefinition(this.name, this)
				return this.arg.walk(Semantic.Arg, state,info)

			case Semantic.RuleBody:
				/**xxx :- xxx a. addReference*/
				this.name = this.functor.text + "/1"
				state.graph.addReference(this.name, this)
				state.graph.addCall(this.name,info.callerName,this)
				return this.arg.walk(Semantic.Arg, state,info)

			case Semantic.DCGHead:
				/**xxx a --> xxx. addDefinition*/
				this.name = this.functor.text + "/3"
				info.callerName = this.name
				state.graph.addDefinition(this.name, this)
				return this.arg.walk(Semantic.Arg, state,info)

			case Semantic.DCGBody:
				/**xxx --> xxx a. addReference*/
				this.name = this.functor.text + "/3"
				state.graph.addReference(this.name, this)
				state.graph.addCall(this.name,info.callerName,this)
				return this.arg.walk(Semantic.Arg, state,info)

			case Semantic.RuleEval:
				/**:- xxx a.  addRef*/
				this.name = this.functor.text + "/1"
				state.graph.addReference(this.name, this)
				return this.arg.walk(Semantic.Arg, state,info)

			case Semantic.Arg:

			default:
				break
		}
	}
}
type ArgNode = AtomNode | FunctorNode | PrefixOpArgNode | InfixOpArgNode | PostfixOpArgNode
class PrefixOpArgNode extends Node {
	kind = Kind.PrefixOpArgNode;
	functor: token
	arg: ArgNode
	constructor(Op: any, Arg: any) {
		super(Op, Arg)
		this.functor = Op
		this.arg = Arg
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos, this, undefined, this.arg)
	}
	walk(level: number, state: FileState,info:Info): void {
		switch (level) {
			case Semantic.TopLevel:
				/** :- xxx. */
				if (this.functor.text == ":-") {
					return this.arg.walk(Semantic.RuleEval, state,info)
				}
				/**a xxx.  addDefinition*/
				this.name = this.functor.text + "/1"
				return state.graph.addDefinition(this.name, this)
			case Semantic.RuleHead:
				this.name = this.functor.text + "/1"
				info.callerName = this.name
				return state.graph.addDefinition(this.name, this)
			case Semantic.RuleBody:
				this.name = this.functor.text + "/1"
				state.graph.addCall(this.name,info.callerName,this)
				return state.graph.addReference(this.name, this)
			case Semantic.DCGHead:
				this.name = this.functor.text + "/3"
				info.callerName = this.name
				return state.graph.addDefinition(this.name, this)
			case Semantic.DCGBody:
				this.name = this.functor.text + "/3"
				state.graph.addCall(this.name,info.callerName,this)
				return state.graph.addReference(this.name, this)
			case Semantic.RuleEval:
			default:
				break
		}
	}
}
/**
 * ClauseNode 对应一个clause。
 * term, end 中有一个可能是undefined
 */
class ClauseNode extends Node {
	kind = Kind.ClauseNode;
	term?: Node
	end?: token
	constructor(Term: any, endToken?: token) {
		super(Term, endToken)
		this.term = Term
		this.end = endToken
	}
	walk(level: number, state: FileState,info:Info): void {
		this.term?.walk(Semantic.TopLevel, state,info)
	}
	search(pos: Position) {
		return this.term?.search(pos)
	}
}

class  DictNode extends Node{
	constructor(dictTag:token,keyValues:Node[],closeCurly:token){
		super(dictTag,closeCurly)

	}
}


function checkNodeRange(pos: Position, thisNode: Node | undefined, leftNode?: Node, rightNode?: Node): Node | undefined {
	/**如果 pos 不在这个 node 的 range  内 返回空 */
	if (thisNode === undefined)
		return
	if (thisNode.range.start.line > pos.line
		|| (thisNode.range.start.line == pos.line && thisNode.range.start.character > pos.character)) {
		return
	}
	else if (thisNode?.range.end.line < pos.line
		|| (thisNode?.range.end.line == pos.line && thisNode.range.end.character < pos.character)) {
		return
	}
	/**pos 在这个node的range内 查找 比较functor 或 arg */
	else {
		return checkFunctorRange(pos, thisNode, leftNode, rightNode)
	}
}
function checkFunctorRange(pos: Position, thisNode: Node | undefined, leftNode?: Node, rightNode?: Node): Node | undefined {
	const functor = (thisNode as ArgNode).functor
	if (functor === undefined)
		return
	/**pos 在 functor 左 */
	if (functor.range.start.line > pos.line
		|| (functor.range.start.line == pos.line && functor.range.start.character > pos.character)) {
		return leftNode?.search(pos)
	}
	/**pos 在 functor 右 */
	else if (functor?.range.end.line < pos.line
		|| (functor?.range.end.line == pos.line && functor.range.end.character < pos.character)) {
		return rightNode?.search(pos)
	}
	else {
		return thisNode
	}
}
function checTokenRange(pos: Position, thisToken: token): boolean {
	const functor = thisToken

	/**pos 在 token 左 */
	if (functor.range.start.line > pos.line
		|| (functor.range.start.line == pos.line && functor.range.start.character > pos.character)) {
		return false
	}
	/**pos 在 token 右 */
	else if (functor?.range.end.line < pos.line
		|| (functor?.range.end.line == pos.line && functor.range.end.character < pos.character)) {
		return false
	}
	else {
		return true
	}
}
/* mixin is difficult 🤷‍♂️ i choose to wrap it */
class Args extends Node{
	_nodes:Node[]
	constructor(nodes:Node[]){
		super(nodes[0],nodes[nodes.length-1])
		this._nodes=nodes
	}
	walk(level: number, state: FileState,info:Info): void {
		/* always Sematic.Arg */
		this._nodes.forEach(x =>x.walk(Semantic.Arg,state,info))
	}
	/**binary search a node */
	search(pos:Position){ 
		let low = 0, high =this._nodes.length;
		while (low < high){
			/**pos 在 node 右 */
			const mid = Math.floor((low + high)/2)
			const node = this._nodes[mid];
			if (node.range.start.line > pos.line
				|| (node.range.start.line == pos.line && node.range.start.character > pos.character)){
				high = mid;
			}
			/**pos 在 node 右 */
			else if(node?.range.end.line < pos.line
				|| (node?.range.end.line == pos.line && node.range.end.character < pos.character)){
				low = mid + 1;
			}
			else{
				return node.search(pos);
			}
		}
	}
	
	
}
function trimSingleQuote(opName:string) {
	if (opName[0]=="'" && opName[opName.length-1]=="'"){
		return opName.slice(1,-1);
	}
	return opName;
}