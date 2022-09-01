import  moo = require("moo");
import{content} from "./text.js"
export {mylexer,tokenList};
type token = moo.Token;
let lexer = moo.compile({
  /** 
   * .
   * regex match EOF  $(?![\r\n]) 
   * 
  */
  end:{match:/\.(?=\t|\n|\r|$(?![\r\n])|%| )/},
  open_ct: {match:/\s+\(/,lineBreaks:true},
  ws:      {match:/\s+/,lineBreaks:true},
  line_comment: {match:/\%.*?$/,lineBreaks:true},
  block_comment: {match:/\/\*(?:.|\s|\n)*?\*\//,lineBreaks:true},
  cut:{match:"!",type:()=>"atom"},
  open:"(",
  clsoe:")",
  comma:",",
  semicolon:{ match:";",type:()=>"atom"},
  special_atom:{match:/(?:{\s*\})|(?:\[\s*\])/,type:()=>"atom",lineBreaks:true,value:(x)=>(x[0]+x[x.length-1])},
  open_list:"[",
  close_list:"]",
  open_curly:"{",
  close_curly:"}",
  ht_sep:"|",
  string:[
    {match:/"(?:""|\\(?:.|\n)|(?!").)*"/,lineBreaks:true},
    {match:/"(?:""|\\(?:.|\n)|(?!").)*\n/,lineBreaks:true}, //error-recovery
    {match:/`(?:``|\\(?:.|\n)|(?!").)*`/,lineBreaks:true},
    {match:/`(?:``|\\(?:.|\n)|(?!").)*\n/,lineBreaks:true} //error-recovery
  ],
  var:{match:/[_A-Z][_0-9a-zA-Z]*/},
  integer:[
    {match:/0'(?:\\[abcefnrstv\\'"`\r\n]|\\x[0-9A-Fa-f]{1,4}\\?|\\u\[0-9A-Fa-f]{4}|\\U\[0-9A-Fa-f]{8}|\\[0-7]+|(?!\\).)/},
    {match:/0x[0-9A-Fa-f]+/},

    {match:/0o[0-7](?:[0-7_ ]*[0-7])?/},
    {match:/0b[01](?:[01_ ]*[01])?/},
    {match:/[2-9]'[0-9]+/},
    {match:/[0-9](?:[0-9_ ]*[0-9])?/}
  ],
  atom:[
    //TODO /*
    {match:/[a-z][_0-9a-zA-Z]*/},
    {match:/[#$&*+\-./:<=>?@^~\\]+/},
    {match:/'(?:''|\\(?:.|\n)|(?!').)*'/,lineBreaks:true},
    {match:/'(?:''|\\(?:.|\n)|(?!').)*\n/,lineBreaks:true},//error-recovery
  ],
  // error:moo.error
})
type tokenList = {tokens:token[],end:token|undefined}

interface Mylexer extends moo.Lexer{
  getTokens() :tokenList
  clone():Mylexer
}

let mylexer  = lexer as Mylexer;

let MyLexerPrototype = mylexer.constructor.prototype;
MyLexerPrototype.getTokens = function(){
  let tokenList:tokenList={tokens:[],end:undefined};
  let tokens = tokenList.tokens;
  while(true){
    let token= this.next();
    //遇到结尾 返回
    if(!token){
      return tokenList;
    }
    //遇到空格token 注释token 跳过
    if(token.type=='ws'
      ||token.type=='line_comment'
      ||token.type=='block_comment'
    ){
      continue;
    }
    //遇到 . 返回
    if(token.type=="end"){
      tokenList.end = token;
      return tokenList;
    }
    //遇到一般 token 添加到tokens里
    tokens.push(token);
  }
}

// .filter(t => t.type !== 'ws'&& t.type !== 'line_comment'&&t.type!=="block_comment")
// console.log(tokens)