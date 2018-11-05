'use strict'

const espree = require('espree')

class Visitor {

  constructor() {
    this.DEFAULT_INDENT = '  '
    this.indent = ''
  }

  I(cb) {
    this.indentInc()
    const ret = cb.bind(this)()
    this.indentDec()
    return ret
  }

  indentInc() {
    this.indent += this.DEFAULT_INDENT
  }

  indent2() {
    return this.indent + this.DEFAULT_INDENT
  }

  indentDec() {
    this.indent = this.indent.substring(0, this.indent.length - this.DEFAULT_INDENT.length)
  }

  T(node) {
    if (node == null) return

    if (node.type === undefined) {
      throw new Error(`Nt a node ${JSON.stringify(node)}`)
    }

    if (this[node.type]) {
      return this[node.type](node)
    } else {
      throw new Error(`Unknown node type ${node.type} (${Object.keys(node)})`)
    }
  }

  traverse(node) {
    return this.T(node)
  } 

  Identifier(node) {
    return node.name
  }

  Literal(node) {
    return node.raw
  }

  ArrayPattern(node) {
    const elems = node.elements.map(e => this.T(e)) 
    return `[ ${elems.join(', ')} ]`
  }

  ArrayExpression(node) {
    const elems = node.elements.map(e => this.T(e))
    return `[ ${elems.join(', ')} ]`
  }

  ClassBody(node) {
    const stmts = node.body.map(e => this.T(e))
    if (stmts.length === 0) {
      return `${this.indent}pass\n`
    }
    return this.indent + stmts.join(`${this.indent}\n`)
  }

  BlockStatement(node) {
    const stmts = node.body.map(e => this.T(e))
    if (stmts.length === 0) {
      return `${this.indent}pass\n`
    }
    return this.indent + stmts.join(`${this.indent}\n`)
  }

  ClassDeclaration(n) {
    return this.I(() => {
      const superClass = n.superClass ? `(${this.T(n.superClass)})` : ''
      const body = this.T(n.body)
      return `class ${this.T(n.id)}${superClass}:
${body}`
    })
  }

  BinaryExpression(node) {
    const left = this.T(node.left)
    const right = this.T(node.right)
    const left2 = node.left.type === 'BinaryExpression' ? `(${left})` : left
    const right2 = node.right.type === 'BinaryExpression' ? `(${right})` : right
    return `${left2} ${node.operator} ${right2}`
  }

  ForStatement(node) {
    const asForInRange = false ||
      (node.init.type === 'VariableDeclaration' && node.init.declarations.length === 1) &&
      (node.update.type === 'UpdateExpression' && node.update.operator === '++') &&
      (node.test.type === 'BinaryExpression')

    if (asForInRange) {
      this.indentInc()
      const body = this.T(node.body)
      this.indentDec()

      const id = node.init.declarations[0].id.name
      const low = this.T(node.init.declarations[0].init)
      const high = this.T(node.test.right)
      return `for ${id} in range(${low}, ${high}):\n${body}`
    } else {
      const init = this.T(node.init)
      const test = this.T(node.test)
      const update = this.T(node.update)
      this.indentInc()
      const body = this.T(node.body)
      this.indentDec()
      return `${init}
${this.indent}while ${test}:
${this.indent}${body}${this.indent2()}${update}
`
    }
  }

  IfStatement(node) {
    this.indentInc()
    const test = this.T(node.test)
    const consequent = this.T(node.consequent)
    const alternate = this.T(node.alternate)
    this.indentDec()

    const optionalAlternate = alternate ? `\nelse:\n${this.indent}${alternate}` : ''
    
    return `if ${test}:
${this.indent}${consequent}${optionalAlternate}`
  }

  CallExpression(node) {
    const callee = this.T(node.callee)
    const args = node.arguments.map(arg => this.T(arg))
    return `${callee}(${args.join(', ')})`
  }

  MemberExpression(node) {
    const object = this.T(node.object)
    const property = this.T(node.property)
    return `${object}.${property}`
  }

  ExpressionStatement(node) {
    return this.T(node.expression)
  }

  AssignmentExpression(node) {
    const left = this.T(node.left)
    const right = this.T(node.right)
    return `${left} ${node.operator} ${right}`    
  }

  VariableDeclarator(node) {
    const id = this.T(node.id)
    const init = this.T(node.init)
    
    return `${id} = ${init}`
  }

  VariableDeclaration(node) {
    const decls = node.declarations.map(e => this.T(e))
    return decls.join('\n')
  }

  Program(node) {
    const stmts = node.body.map(e => this.T(e)) 
    return stmts.join('\n')
  }
}

class JS2Py {

  convert(code) {
    const ast = espree.parse(code, {
      ecmaVersion: 6
    })
    const visitor = new Visitor()
    return visitor.T(ast)
  }
}

module.exports = JS2Py
