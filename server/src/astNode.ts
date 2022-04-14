
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
	KeyValueNode,
	Semantic
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
class Node {
	walk(level: number, state: FileState) { };
	range!: Range
	fullRange!: Range
	kind!: Kind
	functor:  token |undefined
	sematic?:Semantic
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
	search(pos:Position):Node|undefined{
		return
	}
}
class VarNode extends Node {
	kind = Kind.VarNode;
	functor
	constructor(vartoken: token) {
		super(vartoken)
		this.functor = vartoken
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
		if (checTokenRange(pos,this.sign)
		||checTokenRange(pos,this.number)){
			return this;
		}
	}

}
class FunctorNode extends Node {
	kind = Kind.FunctorNode;
	functor: token
	// open: token;
	// close: token;
	arg: ArgNode|ListNode
	arity: number
	constructor(functor: token, arg: ListNode | AtomNode) {
		super(functor, arg)
		this.functor = functor
		if (arg instanceof ListNode) {
			this.arity = arg.right.length + 1
		}
		else {
			this.arity = 1
		}
		this.arg = arg;
	}
	search(pos: Position):Node|undefined{
		return checkNodeRange(pos,this,this.arg);
	}
	getArgs() {
		if (this.arg instanceof ListNode){
			const args = [this.arg.left]
			let p = this.arg.right
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
		else{
			return [this.arg];
		}
	}
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
            case Semantic.TopLevel:{
				/* a(xxx). */
				const name = this.functor.text+"/"+this.arity;
				return state.graph.addDefinition(name, this)
            }
            case Semantic.RuleHead:{
				/* a(xxx) :- xxx. */
				const name = this.functor.text+"/"+this.arity;
				return state.graph.addDefinition(name, this)
            }
            case Semantic.RuleBody:{
				/* xxx :- a(xxx). */
				const name = this.functor.text+"/"+this.arity;
				return state.graph.addReference(name, this)
            }
            case Semantic.DCGHead:{
				/* a(xxx) --> xxx. */
				const name = this.functor.text+"/"+(this.arity+2);
				return state.graph.addDefinition(name, this)
            }
            case Semantic.DCGBody:{
				/*xxx --> a(xxx). */
				const name = this.functor.text+"/"+(this.arity+2);
				return state.graph.addReference(name, this)
            }
            case Semantic.RuleEval:{
				/*:- a(xxx). */
				state.opTable.tryNode(this);
				const name = this.functor.text+"/"+this.arity;
				return state.graph.addReference(name, this);
            }
            case Semantic.Arg:{
                
            }
            default:
                break;
        }
	}

}
class IntegerNode extends Node {
	kind = Kind.IntegerNode;
	functor: token
	constructor(head: token, tail?: token) {
		super(head, tail)
		this.functor = head
	}
	search(pos: Position): Node | undefined {
		return checkNodeRange(pos,this);
	}
}
const enum INFO {
	definition
}
class AtomNode extends Node {
	kind = Kind.AtomNode;
	functor: token
	constructor(head: token, tail?: token) {
		super(head, tail)
		this.functor = head
	}
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
			case Semantic.TopLevel: {
				/* a.  addDefinition */
				const name = this.functor.text
				return state.graph.addDefinition(name, this)
			}
			case Semantic.RuleHead: {
				/*  a :- xxx.   addDefinition */
				const name = this.functor.text
				return state.graph.addDefinition(name, this)
			}
			case Semantic.RuleBody: {
				/*  xxx :- a.  addReference*/
				const name = this.functor.text
				return state.graph.addReference(name, this)
			}
			case Semantic.DCGHead: {
				/* a -> xxx. addDefinition */
				const name = this.functor.text + "/2"
				return state.graph.addDefinition(name, this)
			}
			case Semantic.DCGBody: {
				/* xxx --> a.  addReference*/
				const name = this.functor.text + "/2"
				return state.graph.addReference(name, this)
			}
			case Semantic.Arg: {
				/*  xxx --> a.  addReference*/
				const name = this.functor.text
				return state.graph.addReference(name, this)
			}
			default:
				break
		}
	}
}
class StringNode extends Node {
	kind = Kind.StringNode;
	functor: token
	constructor(string: token) {
		super(string)
		this.functor = string
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
	left: ArgNode
	right: any
	length: number
	//       [OpenList,Arg1,RestArgs]
	constructor(left: ArgNode, right: ListNode) {
		super(left, right)
		this.left = left
		this.right = right
		if (right instanceof AtomNode) {
			this.length = 1
		} else {
			this.length = 1 + right.length
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
	term: ArgNode
	constructor(open: token, term: any, close: token) {
		super(open, close)
		// this.openCurly = ts[0];
		// this.closeCurly = ts[2];
		this.term = term
	}
	walk(level: number, state: FileState): void {
		
		switch (level) {
            case Semantic.TopLevel:{
				/**{xxx}. */
				return state.graph.addDefinition("{}/1",this)
            }
            case Semantic.RuleHead:{
				/**{xxx}:-xxx. */
				return state.graph.addDefinition("{}/1",this)
            }
            case Semantic.RuleBody:{
				/**xxx:-{xxx} */
				return state.graph.addReference("{}/1",this)
            }
            case Semantic.DCGHead:{
				/**{xxx}-->xxx. */
				return pushError(this.range,"No permission to define dcg_nonterminal `{xxx}'");
            }
            case Semantic.DCGBody:{
				/**xxx-->{xxx} */
				return this.term.walk(Semantic.RuleBody,state);
            }
            case Semantic.RuleEval:{
				/** :- {xxx} */
				return state.graph.addReference("{}/1",this);
            }
            case Semantic.Arg:{
            }
            default:
                break;
        }
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
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
            case Semantic.TopLevel:{
				if (this.functor.text ==":-"){
					/** xxx :- xxx. */
					this.left.walk(Semantic.RuleHead,state);
					return this.right.walk(Semantic.RuleBody,state);
				}
				else if (this.functor.text = "-->"){
					/**xxx --> xxx. */
					this.left.walk(Semantic.DCGHead,state);
					return this.right.walk(Semantic.DCGBody,state);
				}
				/**xxx a xxx. */
				const name = this.functor.text+"/2";
				return state.graph.addDefinition(name,this);
            }
            case Semantic.RuleHead:{
				/**xxx a xxx :- xxx. */
				const name = this.functor.text+"/2";
				return state.graph.addDefinition(name,this);
            }
            case Semantic.RuleBody:{
				/** xxx :- xxx a xxx. */
				const name = this.functor.text+"/2";
				return state.graph.addReference(name,this);
            }
            case Semantic.DCGHead:{
				/**xxx a xxx --> xxx. */
				const name = this.functor.text+"/4";
				return state.graph.addDefinition(name,this);
            }
            case Semantic.DCGBody:{
				/**xxx --> xxx a xxx. */
				const name = this.functor.text+"/4";
				return state.graph.addReference(name,this);
            }
            case Semantic.RuleEval:{
				/**:- xxx a xxx. */
				const name = this.functor.text+"/4";
				return state.graph.addReference(name,this);
            }
            case Semantic.Arg:{
                
            }
            default:
                break;
        }
	}
	search(pos: Position): Node | undefined {
		return checkFunctorRange(pos,this,this.left,this.right)
	}
}
class CommaNode extends Node {
	kind = Kind.CommaNode;
	// comma: token;
	left:ArgNode
	right: ArgNode
	constructor(Term: any, Next: any) {
		super(Term, Next)
		// this.comma = tks[0];
		this.left = Term
		this.right = Next
	}
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
            case Semantic.TopLevel:{
				/**xxx , xxx. */
				pushError(this.range,"Cannot redefine ,/2")
            }
            case Semantic.RuleHead:{
				/**xxx , xxx :- xxx. */
				pushError(this.range,"No permission to modify static procedure `(',')/2'")
            }
            case Semantic.RuleBody:{
				/**xxx:- xxx, xxx. */
				this.left.walk(Semantic.RuleBody,state);
				return this.right.walk(Semantic.RuleBody,state);
            }
            case Semantic.DCGHead:{
				/**xxx,xxx --> xxx. */
				this.left.walk(Semantic.DCGHead,state);
				return this.right.walk(Semantic.DCGBody,state);

            }
            case Semantic.DCGBody:{
				/**xxx --> xxx,xxx. */
				this.left.walk(Semantic.DCGBody,state);
				return this.right.walk(Semantic.DCGBody,state);
            }
            case Semantic.RuleEval:{
				/**:- xxx,xxx. */
				this.left.walk(Semantic.RuleEval,state);
				return this.right.walk(Semantic.RuleEval,state);

            }
            case Semantic.Arg:{
                
            }
            default:
                break;
        }
	}
}

class SemicolonNode extends Node {
	kind = Kind.SemicolonNode;
	// semicolon: token;
	left: ArgNode
	functor:token
	right: ArgNode
	constructor(Term: any,functor:token, Next: any) {
		super(Term, Next)
		// this.semicolon = tks[0];
		this.functor=functor
		this.left = Term
		this.right = Next
	}
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
			case Semantic.TopLevel: {	
				return pushError(this.range, "No permission to modify static procedure `(;)/2'")
			}
			case Semantic.RuleHead: {
				return pushError(this.range, "No permission to modify static procedure `(;)/2'")
			}
			case Semantic.RuleBody: {
				this.left.walk(Semantic.RuleBody,state);
				return this.right.walk(Semantic.RuleBody,state);
			}
			case Semantic.DCGHead: {
				pushError(this.range,"No permission to define dcg_nonterminal `Semicolon'")
			}
			case Semantic.DCGBody: {
				this.left.walk(Semantic.DCGBody,state);
				return this.right.walk(Semantic.DCGBody,state);
			}
			case Semantic.RuleEval: {
				this.left.walk(Semantic.RuleEval,state);
				return this.right.walk(Semantic.RuleEval,state);

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
		return checkNodeRange(pos,this,this.arg)
	}
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
			case Semantic.TopLevel: {
				/**xxx a.  addDefinition*/
				const name = this.functor.text + "/1"
				state.graph.addDefinition(name, this)
				return this.arg.walk(Semantic.Arg, state)
			}
			case Semantic.RuleHead: {
				/**xxx a :- xxx. addDefinition*/
				const name = this.functor.text + "/1"
				state.graph.addDefinition(name, this)
				return this.arg.walk(Semantic.Arg, state)
			}
			case Semantic.RuleBody: {
				/**xxx :- xxx a. addReference*/
				const name = this.functor.text + "/1"
				state.graph.addReference(name, this)
				return this.arg.walk(Semantic.Arg, state)
			}
			case Semantic.DCGHead: {
				/**xxx a --> xxx. addDefinition*/
				const name = this.functor.text + "/3"
				state.graph.addDefinition(name, this)
				return this.arg.walk(Semantic.Arg, state)
			}
			case Semantic.DCGBody: {
				/**xxx --> xxx a. addReference*/
				const name = this.functor.text + "/3"
				state.graph.addReference(name, this)
				return this.arg.walk(Semantic.Arg, state)
			}
			case Semantic.RuleEval: {
				/**:- xxx a.  addRef*/
				const name = this.functor.text + "/1"
				state.graph.addReference(name, this)
				return this.arg.walk(Semantic.Arg, state)
			}
			case Semantic.Arg: {
			}
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
		return checkNodeRange(pos,this,undefined,this.arg)
	}
	walk(level: number, state: FileState): void {
		this.sematic = level
		switch (level) {
			case Semantic.TopLevel: {
				/** :- xxx. */
				if (this.functor.text == ":-") {
					return this.arg.walk(Semantic.RuleEval, state)
				}
				/**a xxx.  addDefinition*/
				const name = this.functor.text + "/1"
				return state.graph.addDefinition(name, this)
			}
			case Semantic.RuleHead: {
				const name = this.functor.text + "/1"
				return state.graph.addDefinition(name, this)
			}
			case Semantic.RuleBody: {
				const name = this.functor.text + "/1"
				return state.graph.addReference(name, this)
			}
			case Semantic.DCGHead: {
				const name = this.functor.text + "/3"
				return state.graph.addDefinition(name, this)
			}
			case Semantic.DCGBody: {
				const name = this.functor.text + "/3"
				return state.graph.addReference(name, this)
			}
			case Semantic.RuleEval: {

			}
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
	walk(level: number, state: FileState): void {
		this.sematic = level
		this.term?.walk(Semantic.TopLevel, state)
	}
	search(pos:Position){
		return this.term?.search(pos);
	}
}
class KeyValueNode extends Node {
	Key: any
	Value: token
	constructor(Key: any, Value: token) {
		super(Key, Value)
		this.Key = Key
		this.Value = Value
	}
}

function checkNodeRange(pos: Position,thisNode:Node|undefined,leftNode?:Node,rightNode?:Node): Node | undefined {
	/**如果 pos 不在这个 node 的 range  内 返回空 */
	if (thisNode === undefined)
		return 
	if (thisNode.range.start.line >pos.line
		||(thisNode.range.start.line==pos.line && thisNode.range.start.character > pos.character  )){
		return 
	}
	else if(thisNode?.range.end.line <pos.line 
		||(thisNode?.range.end.line==pos.line && thisNode.range.end.character < pos.character)){
		return 
	}
	/**pos 在这个node的range内 查找 比较functor 或 arg */
	else{
		return checkFunctorRange(pos,thisNode,leftNode,rightNode);
	}
}
function checkFunctorRange(pos: Position,thisNode:Node|undefined,leftNode?:Node,rightNode?:Node): Node | undefined  {
	const functor = (thisNode as ArgNode).functor;
		if (functor === undefined)
			return 
		/**pos 在 functor 左 */
		if (functor.range.start.line >pos.line
			||(functor.range.start.line==pos.line && functor.range.start.character > pos.character  )){
			return leftNode?.search(pos);
		}
		/**pos 在 functor 右 */
		else if(functor?.range.end.line <pos.line 
			||(functor?.range.end.line==pos.line && functor.range.end.character < pos.character)){
			return rightNode?.search(pos);
		}
		else{
			return thisNode
		}
}
function checTokenRange(pos: Position,thisToken:token,leftNode?:Node,rightNode?:Node): boolean  {
	const functor = thisToken ;

		/**pos 在 functor 左 */
		if (functor.range.start.line >pos.line
			||(functor.range.end.line==pos.line && functor.range.end.character > pos.character  )){
			return false;
		}
		/**pos 在 functor 右 */
		else if(functor?.range.end.line <pos.line 
			||(functor?.range.end.line==pos.line && functor.range.end.character < pos.character)){
			return false;
		}
		else{
			return true;
		}
}