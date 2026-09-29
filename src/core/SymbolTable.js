/**
 * SymbolTable.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Implements a functional, scope-aware Symbol Table data structure used
 * during lexical analysis, syntax checking, and assembly.
 */

import { STATUS, getTypeSize, isValidIdentifier } from '../utils/Constants.js';

/**
 * Represents a single record inside the Symbol Table.
 */
export class SymbolEntry {
  constructor({
    name,
    type = 'int',
    scope = 'global',
    size = 4,
    address = 0,
    lineDeclared = 1,
    linesReferenced = []
  }) {
    this.name = name;
    this.type = type;
    this.scope = scope;
    this.size = size;
    this.address = address;
    this.lineDeclared = lineDeclared;
    this.linesReferenced = [...linesReferenced];
  }

  /**
   * Adds a line number to the list of referenced lines if not already recorded.
   * @param {number} line
   */
  addReferenceLine(line) {
    if (typeof line === 'number' && !this.linesReferenced.includes(line)) {
      this.linesReferenced.push(line);
      this.linesReferenced.sort((a, b) => a - b);
    }
  }

  /**
   * Returns a clean JSON representation of this symbol.
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      scope: this.scope,
      size: this.size,
      address: this.address,
      lineDeclared: this.lineDeclared,
      linesReferenced: [...this.linesReferenced]
    };
  }
}

/**
 * Functional Symbol Table Manager.
 */
export class SymbolTable {
  constructor(baseAddress = 1000) {
    this.baseAddress = baseAddress;
    this.currentOffset = baseAddress;
    // Map using composite key: `${scope}::${name}`
    this.entries = new Map();
  }

  /**
   * Generates internal composite lookup key for scope isolation.
   * @private
   */
  _makeKey(name, scope = 'global') {
    return `${String(scope).trim()}::${String(name).trim()}`;
  }

  /**
   * Simple Polynomial Rolling Hash helper for demonstration during viva.
   * Formula: H = (H * 31 + charCode) % tableSize
   *
   * @param {string} name - Identifier string
   * @param {number} tableSize - Bucket count (defaults to 101 prime)
   * @returns {number} Computed bucket index
   */
  hash(name, tableSize = 101) {
    if (!name || typeof name !== 'string') return 0;
    let h = 0;
    for (let i = 0; i < name.length; i++) {
      h = (h * 31 + name.charCodeAt(i)) % tableSize;
    }
    return Math.abs(h);
  }

  /**
   * Inserts a new symbol into the table.
   * Supports either an options object or positional arguments.
   *
   * @param {Object|string} nameOrConfig
   * @param {string} [type='int']
   * @param {string} [scope='global']
   * @param {number|null} [size=null]
   * @param {number|null} [address=null]
   * @param {number} [lineDeclared=1]
   * @returns {{ success: boolean, status: string, message?: string, entry?: SymbolEntry }}
   */
  insert(nameOrConfig, type = 'int', scope = 'global', size = null, address = null, lineDeclared = 1) {
    let name = nameOrConfig;
    if (typeof nameOrConfig === 'object' && nameOrConfig !== null) {
      ({
        name,
        type = 'int',
        scope = 'global',
        size = null,
        address = null,
        lineDeclared = 1
      } = nameOrConfig);
    }

    if (!isValidIdentifier(name)) {
      return {
        success: false,
        status: STATUS.INVALID_NAME,
        message: `Invalid identifier name '${name}'. Must match [a-zA-Z_][a-zA-Z0-9_]* and not be a keyword.`
      };
    }

    const key = this._makeKey(name, scope);

    // Rejection rule: duplicate symbol in the same scope
    if (this.entries.has(key)) {
      return {
        success: false,
        status: STATUS.DUPLICATE_SYMBOL,
        message: `Duplicate declaration: Symbol '${name}' is already defined in scope '${scope}'.`
      };
    }

    // Determine memory size
    const finalSize = (typeof size === 'number' && size >= 0) ? size : getTypeSize(type);

    // Determine address: auto-calculated offset if not explicitly provided
    let finalAddress;
    if (typeof address === 'number') {
      finalAddress = address;
      if (address + finalSize > this.currentOffset) {
        this.currentOffset = address + finalSize;
      }
    } else {
      finalAddress = this.currentOffset;
      this.currentOffset += finalSize;
    }

    const entry = new SymbolEntry({
      name,
      type,
      scope,
      size: finalSize,
      address: finalAddress,
      lineDeclared: typeof lineDeclared === 'number' ? lineDeclared : 1
    });

    this.entries.set(key, entry);

    return {
      success: true,
      status: STATUS.SUCCESS,
      entry
    };
  }

  /**
   * Looks up a symbol by name with standard scope resolution:
   * First checks in the specified scope; if not found and scope != 'global', checks 'global'.
   *
   * @param {string} name - Identifier name
   * @param {string} [scope='global'] - Current scope context
   * @returns {SymbolEntry|null} Found symbol entry or null
   */
  lookup(name, scope = 'global') {
    if (!name) return null;

    // 1. Check local scope
    const localKey = this._makeKey(name, scope);
    if (this.entries.has(localKey)) {
      return this.entries.get(localKey);
    }

    // 2. Fall back to global scope if different
    if (scope !== 'global') {
      const globalKey = this._makeKey(name, 'global');
      if (this.entries.has(globalKey)) {
        return this.entries.get(globalKey);
      }
    }

    return null;
  }

  /**
   * Records that an identifier was referenced at a particular line number.
   *
   * @param {string} name - Identifier name
   * @param {number} line - Line number of usage
   * @param {string} [scope='global'] - Current scope context
   * @returns {boolean} True if reference was added
   */
  addReference(name, line, scope = 'global') {
    const entry = this.lookup(name, scope);
    if (entry) {
      entry.addReferenceLine(line);
      return true;
    }
    return false;
  }

  /**
   * Updates attributes of an existing symbol in a specific scope.
   *
   * @param {string} name - Identifier name
   * @param {Object} attributes - Attributes to update { type, size, address, lineDeclared }
   * @param {string} [scope='global'] - Target scope
   * @returns {{ success: boolean, status: string, message?: string, entry?: SymbolEntry }}
   */
  update(name, attributes = {}, scope = 'global') {
    const key = this._makeKey(name, scope);
    if (!this.entries.has(key)) {
      return {
        success: false,
        status: STATUS.NOT_FOUND,
        message: `Cannot update: Symbol '${name}' not found in scope '${scope}'.`
      };
    }

    const entry = this.entries.get(key);

    if (attributes.type !== undefined) {
      entry.type = attributes.type;
      // Auto-update size if not explicitly specified
      if (attributes.size === undefined) {
        entry.size = getTypeSize(attributes.type);
      }
    }

    if (attributes.size !== undefined && typeof attributes.size === 'number') {
      entry.size = attributes.size;
    }

    if (attributes.address !== undefined && typeof attributes.address === 'number') {
      entry.address = attributes.address;
    }

    if (attributes.lineDeclared !== undefined && typeof attributes.lineDeclared === 'number') {
      entry.lineDeclared = attributes.lineDeclared;
    }

    return {
      success: true,
      status: STATUS.SUCCESS,
      entry
    };
  }

  /**
   * Deletes a symbol from a specific scope.
   *
   * @param {string} name - Identifier name
   * @param {string} [scope='global'] - Scope to delete from
   * @returns {{ success: boolean, status: string, message?: string }}
   */
  delete(name, scope = 'global') {
    const key = this._makeKey(name, scope);
    if (!this.entries.has(key)) {
      return {
        success: false,
        status: STATUS.NOT_FOUND,
        message: `Cannot delete: Symbol '${name}' not found in scope '${scope}'.`
      };
    }

    this.entries.delete(key);
    return {
      success: true,
      status: STATUS.SUCCESS,
      message: `Symbol '${name}' in scope '${scope}' deleted.`
    };
  }

  /**
   * Returns all active symbols formatted as an array for table rendering.
   *
   * @returns {Array<Object>} List of symbol records
   */
  getAllEntries() {
    const list = [];
    for (const entry of this.entries.values()) {
      list.push(entry.toJSON());
    }
    // Return sorted by memory address
    return list.sort((a, b) => a.address - b.address);
  }

  /**
   * Resets the symbol table and clears memory offset.
   */
  clear() {
    this.entries.clear();
    this.currentOffset = this.baseAddress;
  }
}
