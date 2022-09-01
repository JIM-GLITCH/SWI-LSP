
import { Token } from 'moo'
import { Diagnostic, DiagnosticSeverity, Position, Range } from 'vscode-languageserver'
import { type Graph } from '../server/src/graph'
import { tokenList } from '../server/src/lexer-by-moo'
import { optable } from '../server/src/operators'
import {error} from "../server/src/pushDiagnostic"
export {
	compound,
	prefix_compound,
	infix_compound,
	postfix_compound,
	negetive,
	clause,
	CstNode,
	Atomic as Atomic ,
	fileCst,
	isCstBranchNode,
	list,
	tokenRange,
	dict,
	Args
}
/**Sematic level */
const enum S {
	TopLevel = 1,
	DCG,
	RuleHead,
	DCGHead,
	RuleBody,
	DCGBody,
	Arg,
	RuleEval
}

interface AnalyseCtx{
	callerNode:CstNode
	graph:Graph
	optable:optable
	diagnostics:Diagnostic[]
}

interface CstNode{
	level:number
	type:string
	token:Token
	value:string
	startToken:Token
	endToken:Token
	name:string
	getRange():Range
	search(pos:Position):CstNode|undefined
}
interface CstBranchNode extends CstNode{
	args:CstNode[]
}



class Atomic implements CstNode {
	level!:number
	token:Token
	type="atomic"
	startToken: Token
	endToken: Token
	value: string;
	name:string
	constructor(token:Token,value?:string){
		this.token=token
		this.startToken = token;
		this.endToken = token;
		this.value = value??token.value;
		this.name = this.value;
	}
	search(pos:Position):CstNode|undefined{
		return checkFunctorRange(pos,this,undefined,undefined)
	}
	getRange(){
		return tokenToRange(this.startToken,this.endToken)
	}
	getName(level:number){
		this.level= level;
		switch (this.level) {
			case S.DCGHead:
			case S.DCGBody:
				return this.value + '/'+2
				break;
		
			default:
				return this.value
				break;
		}
	}
	analyse(level: number, ctx: AnalyseCtx): void {
		this.getName(level);
		switch (level) {
			case S.TopLevel:
				break
			case S.RuleHead:

				break;
			case S.RuleBody:

				break;
			case S.DCGHead:

				break;
			case S.DCGBody:

				break;
			case S.Arg:

				break;
			default:
				break;
		}
	}
}

class Atom extends Atomic{
	constructor(token:Token,value?:string){
		super(token,value);
	}
	analyse(level: number, ctx: AnalyseCtx): void {
		this.getName(level)
		switch (level) {
			case S.TopLevel:
				// a.
				ctx.graph.addDefinition(this)
				break
			case S.RuleHead:
				//  a:- xxx.
				ctx.callerNode = this;
				ctx.graph.addDefinition(this)
				break;
			case S.RuleBody:
				// xxx :- a.
				ctx.graph.addReference(this)
				break;
			case S.DCGHead:
				// a -> xxx.
				ctx.callerNode = this
				ctx.graph.addDefinition(this)
				break;
			case S.DCGBody:
				// xxx-> a.
				ctx.graph.addReference(this)
				break;
			case S.Arg:
				// xxx(a).
				ctx.graph.addReference(this)
				break;
			default:
				break;
		}
	}
}

class Var extends Atomic{
	constructor(token:Token,value?:string){
		super(token,value);
	}
	analyse(level: number, ctx: AnalyseCtx): void {
		this.getName(level);
		switch (level) {
			case S.TopLevel:
				ctx.diagnostics.push(error(this.getRange(),"Arguments are not sufficiently instantiated"))
				break
			case S.RuleHead:   
				ctx.diagnostics.push(error(this.getRange(),"Arguments are not sufficiently instantiated"))
				break;
			case S.RuleBody:
				ctx.diagnostics.push(error(this.getRange(),"Arguments are not sufficiently instantiated"))
				break;
			case S.DCGHead:
				ctx.diagnostics.push(error(this.getRange(),"Arguments are not sufficiently instantiated"))
				break;
			case S.DCGBody:
				break;
			case S.Arg:

				break;
			default:
				break;
		}
	}
}
class TNumber extends Atomic{
}


interface search{
	search(pos:Position):CstNode|undefined
}


function islist(x:unknown):x is list {
	return typeof x =='object' && !!x && "refreshEndToken" in x;
	
}

class compound  implements CstBranchNode {
	/**sematic level */
	level!:number
	name!: string
	/** 
	 * 确定arity是多少 
	*/
	getArity(){
		switch (this.level){
			case S.DCGBody:
			case S.DCGBody:
				if(!(this.value==',' && this.args.length ==2)){
					return  (this.args.length+2)
				}
			default:
				return  (this.args.length)
		}
	}
	getName(level:number){
		this.level = level;
		switch(level){
			case S.DCGBody:
			case S.DCGBody:
				return this.value+'/'+(this.args.length+2)
			default:
				return this.value+'/'+this.args.length
		}
	}
	search(pos:Position):CstNode|undefined{
		return checkFunctorRange(pos,this,undefined,this.args)
	}
	type="compound"	
	token: Token
	value:string
	args:Args
	startToken:Token;
	endToken:Token;
	constructor(functor: Token, args: CstNode[],funcVal?:string) {
		this.token = functor
		this.args = new Args(...args)
		this.value = funcVal?funcVal:functor.value;
		this.startToken = functor
		this.endToken = args[args.length-1].endToken;
	}
	getRange():Range{
		return tokenToRange(this.startToken,this.endToken)
	}
}

class list extends compound{
	constructor(functor: Token, args: CstNode[],funcVal?:string) {
		super(functor,args,funcVal);
	}
	refreshEndToken(endtoken:Token):undefined{
		this.endToken = endtoken;
		let node = this.args[this.args.length-1]
		if(islist(node)){
			return node.refreshEndToken(endtoken);
		}
	}
}


class prefix_compound extends compound {
	type = "prefix_compound"
	level!: number;
	name!:string
	constructor(functor: Token, args: CstNode[],funcVal?:string) {
		super(functor,args,funcVal);
	}
	search(pos: Position): CstNode | undefined {
		return checkFunctorRange(pos,this,undefined,this.rArg)
	}
	public get rArg() {
		return this.args[0]
	}
}

class infix_compound extends compound {
	type="infix_compound"
	endToken: Token
	startToken: Token
	constructor(functor: Token, args: CstNode[],funcVal?:string) {
		super(functor,args,funcVal);
		this.endToken = args[1].endToken;
		this.startToken=args[0].startToken;
	}
	search(pos: Position): CstNode | undefined {
		return checkFunctorRange(pos,this,this.lArg,this.rArg)
	}
	public get lArg() {
		return this.args[0]
	}
	public get rArg() {
		return this.args[1]
	}
}

class postfix_compound extends compound {
	type="postfix_compound"
	endToken: Token
	startToken: Token
	token: Token
	constructor(functor: Token, args: CstNode[],funcVal?:string) {
		super(functor,args,funcVal);
		this.startToken=args[0].startToken;
		this.token=functor
		this.endToken = this.token
	}
	search(pos: Position): CstNode | undefined {
		throw checkFunctorRange(pos,this,this.lArg,undefined)
	}
	public get lArg() {
		return this.args[0]
	}


}

class dict extends compound{
	token: Token;
	type="dict";
	value="C'dict'";
	startToken: Token
	endToken: Token
	args:Args
	tag:CstNode
	constructor(token:Token,nodes:CstNode[]){
		super(token,nodes,"C'dict")
		this.token=token;
		this.tag=nodes[0];
		this.startToken=nodes[0].startToken;
		this.endToken=nodes[nodes.length-1]?.endToken??nodes[0].endToken;
		this.args=new Args(...nodes)
	}
	analyse(level: number, ctx: AnalyseCtx): void {
		this.getName(level);
		//TODO
	}
	search(pos: Position): CstNode | undefined {
		return checkFunctorRange(pos,this,this.tag,this.args);
	}
}
class negetive implements CstNode {
	token: Token;
	type="negetive";
	value: string
	startToken: Token
	endToken: any
	constructor(minus: Token, number: Token) {
		this.token=new TwoTokenToOne(minus,number,"integer");
		this.value = this.token.value
		this.startToken = minus;
		this.endToken = number;
	}
	level!: number
	name!: string
	analyse(level: number, ctx: AnalyseCtx): void {
		this.level = level;
		this.name = this.value;
	}
	search(pos: Position): CstNode | undefined {
		return checkFunctorRange(pos,this,undefined,undefined);
	}
	getRange(): Range {
		return tokenToRange(this.startToken,this.endToken);
	}


}
class TwoTokenToOne implements Token{
	tk1: Token
	tk2: Token
	type
	constructor(minus: Token, number: Token,type:string) {
		this.tk1 = minus
		this.tk2 = number
		this.type = type
	}

	public get text(): string {
		return this.tk1.text + this.tk2.text
	}

	public get value(): string {
		return this.tk1.value + this.tk2.value
	}

	public get line(): number {
		return this.tk1.line
	}

	public get col(): number {
		return this.tk1.col
	}

	public get offset(): number {
		return this.tk1.offset
	}

	public get lineBreaks(): number {
		return this.tk1.lineBreaks + this.tk2.lineBreaks
	}

}


class clause {
	async analyse(level:number,ctx:any) {
		return await this.Term?.analyse(S.TopLevel,ctx);
	}
	
	search(pos: Position):CstNode|undefined {
		return checkFunctorRange(pos,this,this.Term,undefined)
	}
	startToken: Token|undefined
	type = "clause"
	Term: CstNode|undefined
	end: Token | undefined
	tokens: Token[]
	token:Token|undefined
	constructor(Term: CstNode|undefined, TokenList: tokenList) {
		this.Term = Term
		this.end = TokenList.end
		this.tokens = TokenList.tokens
		this.token=this.end;
		this.startToken = Term?.startToken

	}
	getRange():Range{
		if(this.Term && this.end){
			return tokenToRange(this.Term.startToken,this.end);
		}
		else if(this.Term ){
			return tokenToRange(this.Term.startToken,this.Term.endToken);
		}
		else if(this.end){
			return tokenToRange(this.end,this.end);
		}
		return {} as any;
		
	}

}
class Args extends Array<CstNode>{
	constructor(...items: CstNode[]){
		super(...items)
	}
	search(pos:Position){ 
		let low = 0, high =this.length;
		const line = pos.line;
		while (low < high){
			/**pos 在 node 右 */
			const mid = Math.floor((low + high)/2)
			const node = this[mid];
			let range = node.getRange();
			if (range.start.line > pos.line
				|| (range.start.line == pos.line && range.start.character > pos.character)){
				high = mid;
			}
			/**pos 在 node 右 */
			else if(range.end.line < pos.line
				|| (range.end.line == pos.line && range.end.character < pos.character)){
				low = mid + 1;
			}
			else{
				return node.search(pos);
			}
		}
	}   
}
class fileCst extends Array<clause>{
	constructor(...items: clause[]){
		super(...items)
	}
	search(pos:Position){ 
		let low = 0, high =this.length;
		const line = pos.line;
		while (low < high){
			const mid = Math.floor((low + high)/2)
			const clause = this[mid];
			let clauseRange = clause.getRange();
			if (clauseRange.start.line>line){
				high = mid;
			}
			else if(clauseRange.end.line<line){
				low = mid + 1;
			}
			else{
				return clause.search(pos);
			}
		}
	}                  

}

function tokenRange(tk:Token){
	return tokenToRange(tk,tk);
}
function tokenToRange( startTk:Token,endTk:Token):Range{
	return {
		start:{
			line:startTk.line-1,
			character:startTk.col-1
		},
		end:{
			line:endTk.line+endTk.lineBreaks-1,
			character:endTk.lineBreaks?(endTk.text.length-endTk.text.lastIndexOf("\n")-1):(endTk.col+endTk.text.length-1)
		}
	}
}

function checkFunctorRange(pos: Position, thisNode: search , leftNode?: search, rightNode?: search): CstNode | undefined {
	const functor = (<CstNode>thisNode)?.token
	if (functor === undefined)
		return
	/**pos 在 functor 左 */
	let range=tokenRange(functor);
	if (range.start.line > pos.line
		|| (range.start.line == pos.line && range.start.character > pos.character)) {
		return leftNode?.search(pos)
	}
	/**pos 在 functor 右 */
	else if (range.end.line < pos.line
		|| (range.end.line == pos.line && range.end.character < pos.character)) {
		return rightNode?.search(pos)
	}
	else {
		return <CstNode>thisNode
	}
}

function isCstBranchNode(node:unknown): node is CstBranchNode {
	return typeof node =="object" &&!!node && "args" in node;
}

function unshielded(node:CstNode): Boolean{
	return true;
}

function isComma(node:compound){
	if(node.value=="," && node.args.length==2){
		return true;
	}
	return false;
}
function isCurly(node:compound){
	if(node.value=="{}" && node.args.length==1){
		return true;
	}
	return false;
}
function isEval(node:compound) {
	if(node.value==":-" && node.args.length==1){
		return true;
	}
	return false;
}

function isRule(node:compound) {
	if(node.value==":-" && node.args.length==2){
		return true;
	}
	return false;
}
function isDCG(node: compound) {
	if(node.value=="-->" && node.args.length==2){
		return true;
	}
	return false;
}

