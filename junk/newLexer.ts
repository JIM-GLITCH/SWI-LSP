import {match,P}from "ts-pattern"
type Posn = {
	line:number,
	char:number,
	offset:number
}
interface token {

}

class Lexer {
	text: string
	// buffer:Buffer
	/*  position */
	line: number
	char: number
	offset: number
    varSet: Set<string>
	
	constructor(text="",line=0,char = 0,offset = 0){
		this.text=text
		this.line=  line
		this.char = char
		this.offset=offset
        this.varSet=new Set()
	}


	readFullStop(){
		return match(this.getChar())
			.with("","\x1A",()=>{
				return K.end
			})
			.otherwise(x=>{
				if(x<" "){
					return K.end
				}
				return this.readSymbol()
				
			})
			

	}

	readSymbol() {
		while(1){
			const ch = this.lookChar()
			match(ch)
				.with("#","$","&","*","+","-",".","/",":","<","=",">","?","@","\\","^","`","~",
				()=>{
					this.consume(ch)
				}
				).otherwise(()=>{})
		}
		return K.atom;
	}
	/**  
	 * consume  chars of a clause
	 */
	getTokenList(): token[] | undefined {
		if (this.eos())
			return undefined

		
		const tokenList: token[] = []
		for (; ;) {
			const token = this.getToken()
			if (token ==false) {
				break
			}
			tokenList.push(token)

		}
		return tokenList
	}

	/**
	 * consume chars of a token
	 */
	getToken() {
		const layoutStartPos = this.savePos()
		const hasLeadingLayout = this.getLayout()
		const tokenStartPos = this.savePos()
		const tag = this.getPartialToken()
		if(!tag){
			return false;
		}
		const val = this.text.substring(tokenStartPos.offset,this.offset)
		let token = {tag,val,layoutStartPos,hasLeadingLayout,tokenStartPos}
		return token

	}

	getPartialToken():K|false{
		const pos = this.savePos()
		const ch = this.getChar()
		switch (ch) {
			case "":
				return false;
			case "\x1A":
				return false;
			case "!":
				return K.atom
			case "(":
				return K.open
			case ")":
				return K.close
			case ",":
				return K.comma
			case ";":
				return K.atom
			case "[":
				return K.open_list
			case "]":
				return K.close_list
			case "{":
				return K.open_curly
			case "|":
				return K.atom
			case "}":
				return K.close_curly
			case ".":
				return this.readFullStop()
			case "\"":
				this.readString("\"")
				return K.string
			case "'":
				this.readString("'")
				return K.atom
			default:
				break;
		}
		if(ch == "_" || (ch>="A"&&ch<="Z")){
			this.readName();
			const name = this.text.substring( pos.offset,this.offset)
			if(name =="_"){
			}
            else{
                this.varSet.add(name)
            }
            return K.variable;
		}
        else if(ch>='0' || ch<='9'){
            this.readInteger(ch)
            return K.integer;
        }
	}
    readInteger(ch:string) {
        const base = Number(ch)
        const ch2 = this.lookChar()
        if(ch2 == ""){
            return false;
        }
        this.consume(ch2)
        if(ch2!="'"){
            return readDigits()
        }
        else if(base>=1){
            return readDigits()
        }
        else{
            
        }
    }
    readName() {
        while(1){
            let Char =this.lookChar()
            if((Char >= "a"&& Char <="z") //a..z
            || (Char >= "A"&& Char <= "Z")//A..Z
            || (Char >= "0"&& Char <= "9")){//0..9
                this.consume(Char)
            }
            else{
                break
            }
        }
    }
	readString(quote: string):void {
		return match(this.getChar())
			.with("",()=>{
				console.log(`! end of file in ${quote}`)
				return 
			})
			.with(quote,()=>{
				/*  more string */ 
				return match(this.lookChar())
					/* double quote */
					.with(quote,()=>{
						this.consume(quote)
						return this.readString(quote)
					})
					/* end */
					.otherwise(()=>{})
			})
			.otherwise(()=>{
				return this.readString(quote)
			})
	}

	getLayout(){
		return this.oneMore(this.layoutText)
	}

	getChar(){
		const char = this.text[this.offset]
		this.consume(char)
		return char
	}
	/* 处理 字符函数 */
	lookChar(){
		return this.text[this.offset]
	}

	lookStr(number: number){
		return this.text.slice(this.offset,this.offset+number)
	}

	consume(char:string){
		switch (char) {
			case "":
				break;
			case "\n":
				this.offset++
				this.line++
				this.char=0
				break;
			default:
				this.offset++
				this.char++
		}
	}

	layoutText(){
		return this.either(
			this.layoutChar,
			comment
		)
	}

	eos() {
		return this.offset >= this.text.length
	}
	
	/* 逻辑控制函数 */
	zeroMore(param: { (): boolean }){
		for(;;){
			const pos =this.savePos()
			if(!param())
				this.loadPos(pos)
				return true
		}
	
	}

	oneMore(param: () => boolean){
			/* 第一次必须成功 */
			const pos =this.savePos()
			if(!param()){
				this.loadPos(pos)
				return false;
			}
			return this.zeroMore(param)
	}

	either(...params: any[]){
		const pos = this.savePos()
		for (const param of params) {
			if(param())
				return true;
			this.loadPos(pos)
		}
		return false;
	}

	matchChar(char: string){
		if(char!=this.lookChar())
			return false;
		this.consume(char)
		return true
	}
	
	matchEitherChar(...chars: string[]){
		const ch = this.lookChar()
		for (const char of chars) {
			if(char ==ch)
				return true;
		}
		return false;
	}

	matchStr(str: string ){
		if(str != this.lookStr(str.length))
			return false;
		for (const ch of str) {
			this.consume(ch)
		}
	}

	/* 位置控制函数  */

	savePos():Posn{
		return {
			line:this.line,
			char:this.char,
			offset:this.offset
		}
	}
	
	loadPos(pos:Posn){
		this.line=pos.line
		this.char=pos.char
		this.offset=pos.offset
	}
	/* 字符 函数 */
	layoutChar(){
		return this.either(
			this.spaceChar,
			this.horizontalTabChar,
			this.newLineChar
		)
	}
	
	spaceChar(){
		return this.matchChar(" ")
	}
	
	horizontalTabChar(){
		return this.matchChar("\t")
	}

	newLineChar(){
		return this.either(
			this.matchStr("\r\n"),
			this.matchEitherChar("\r","\n"),
		)
	}

	smallLetterChar(){
		const ch = this.lookChar()
		if("a"<=ch && ch<="z"){
			this.consume(ch)
			return true;
		}
		return false;
	}

	alphaNumericChar(){
		return this.either(
			this.alphaChar,
			this.decimalDigitChar
		)
	}

	alphaChar(){
		return this.either(
			this.underScoreChar,
			this.letterChar
		)
	}

	letterChar(){
		return this.either(
			this.capitalLetterChar,
			this.smallLetterChar
		)
	}

	capitalLetterChar(){
		const ch = this.lookChar()
		if("A"<=ch&&ch<="Z"){
			this.consume(ch)
			return true;
		}
		return false;
	}

	decimalDigitChar(){
		const ch =this.lookChar()
		if("0"<=ch&&ch<="9"){
			this.consume(ch)
			return true;
		}
		return false;
	}

	underscoreChar(){
		return this.matchChar("_");
	}

	decimalPointChar(){
		return this.matchChar(".");
	}

	underScoreChar(){
		return this.matchChar("_");
	}


}