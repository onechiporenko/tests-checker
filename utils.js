var walk = require('esprima-walk');
var traverse = require('traverse');
var Table = require('cli-table');
var colors = require('colors');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warning: 'yellow',
  debug: 'blue',
  error: 'red'
});

/**
 * @typedef {object|null} checkerResult
 * @property {{type: string, title: string}} name
 */

/**
 * Callback executed for each child node. Called with one argument - child node
 *
 * @typedef {Callback} checkerFunction
 * @param {object} node
 * @return {checkerResult}
 */

/**
 * @typedef {object} checker
 * @property {checkerFunction} func
 * @property {string} flag name used to mark node as checked with current checker
 */

/**
 * List of checkers used to process each `it`-node
 *
 * @type {checker[]}
 */
var checks = [
  {
    flag: 'emptyTitleProcessed',
    func: function (node) {
      var name = _getNodeName(node);
      if (name === '#EMPTY#') {
        return {
          name: {
            type: 'warning',
            title: '(empty `it` title)'
          }
        };
      }
      return null;
    }
  },
  {
    func: function (node) {
      var sinonIssues = checkSinonIssues(node);
      if (sinonIssues.length) {
        return {
          name: {
            type: 'error',
            title: '(`restore/spy/stub` used in the `it`)'
          }
        };
      }
      return null;
    },
    flag: 'sinonProcessed'
  },
  {
    func: function (node) {
      var expects = tooManyExpects(node);
      var maxExpectCount = 4;
      if (expects > maxExpectCount) {
        return {
          name: {
            type: 'warning',
            title: '(too many `expect` in the `it` - ' + expects + '. Only ' + maxExpectCount + ' allowed)'
          }
        };
      }
      return null;
    },
    flag: 'tooManyExpects'
  }
];

/**
 * Get nested value from object
 *
 * @param {object} obj
 * @param {string} prop
 * @returns {*}
 */
function get(obj, prop) {
  var subpathes = prop.split('.');
  while (subpathes.length) {
    var subpath = subpathes.shift();
    obj = obj[subpath];
    if (!obj) return obj;
  }
  return obj;
}

/**
 * Remove items if there are some bigger items in the array
 * ['a', 'b', 'ac'] => ['ac', 'b']
 *
 * @param {string[]} arr
 * @returns {string[]}
 * @private
 */
function _removeShortItems(arr) {
  var newRet = [];
  arr
    .sort()
    .reverse()
    .forEach(function (item) {
    for (var i = 0; i < newRet.length; i++) {
      if (newRet[i].indexOf(item) === 0) {
        return;
      }
    }
    newRet.push(item);
  });
  return newRet;
}

/**
 * Try detect obj type basing on {}.toString
 *
 * @param {*} obj
 * @returns {string|null}
 * @private
 */
function _getType(obj) {
  var map = {
    '[object Object]': 'object',
    '[object Array]': 'array',
    '[object String]': 'string'
  };
  var t = {}.toString.call(obj);
  return map[t];
}

/**
 * Check if node is processed with all checkers (@see checks)
 * Node should has checks.@each.flag set to `true`
 *
 * @param {object} node
 * @returns {boolean}
 * @private
 */
function _checkNodeIsProcessed(node) {
  for(var i = 0; i < checks.length; i++) {
    if (!get(node, checks[i].flag)) {
      return false;
    }
  }
  return true;
}

/**
 * Check if node has needed name and not already processed with all checkers (@see `checks`)
 * Detects `neededName`, `neededName`.skip and `neededName`.only
 *
 * @param {object} node
 * @param {string} neededName 'it|describe'
 * @returns {boolean}
 * @private
 */
function _checkNode(node, neededName) {
  return (get(node, 'callee.object.name') === neededName || get(node, 'callee.name') === neededName) && !_checkNodeIsProcessed(node);
}

/**
 * Try get node `name` basing on `node.arguments[0].value`
 * If it's an empty string, '#EMPTY#' is returned
 * If name is not a string, '#EXPRESSION#' is returned
 *
 * @param {object} node
 * @returns {string}
 * @private
 */
function _getNodeName(node) {
  var name = node.arguments[0].value;
  var type = _getType(name);
  if (type === 'string') {
    return name ? name : '#EMPTY#';
  }
  return '#EXPRESSION#';
}

/**
 * Check if some of `spy/stub/restore` is called in the `it`
 *
 * @param {object} itNode
 * @returns {object[]}
 */
function checkSinonIssues(itNode) {
  var its = [];
  walk(itNode, function (node) {
    if (['restore', 'spy', 'stub'].indexOf(get(node, 'property.name')) !== -1 && !get(node, 'sinonProcessed')) {
      node.chaiProcessed = true;
      its.push(node);
    }
  });
  return its;
}

/**
 * Get number of `expect` calls in the `it`
 *
 * @param {object} itNode
 * @returns {number}
 */
function tooManyExpects(itNode) {
  var its = [];
  var counter = 0;
  walk(itNode, function (node) {
    if (['expect'].indexOf(get(node, 'object.callee.name')) !== -1 && !get(node, 'tooManyExpects')) {
      node.tooManyExpects = true;
      counter++;
    }
  });
  return counter;
}

/**
 * Move throw `it`-node and check it with `checks`
 *
 * @param {object} describeNode
 * @returns {object[]}
 */
function parseIts(describeNode) {
  var its = [];
  walk(describeNode, function (node) {
    if (_checkNode(node, 'it')) {
      checks.forEach(function (checker) {
        var result = checker.func(node);
        node[checker.flag] = true;
        if (result) {
          result.name.t = _getNodeName(node);
          its.push(result);
        }
      });
    }
  });
  return its;
}

/**
 * Move throw all `describe`-nodes and parse nested `describe` and `it` nodes
 *
 * @param {object|object[]}describeNode
 * @returns {Object|Object[]}
 */
function parseDescribes(describeNode) {
  var describes = [];
  walk(describeNode, function (node) {
    if (_checkNode(node, 'describe')) {
      describes.push({
        name: _getNodeName(node),
        describes: parseDescribes(node.arguments[1]),
        its: parseIts(node.arguments[1])
      });
    }
  });
  return cleanUpTree(describes);
}

/**
 * Remove empty `describes` and `its` properties from nodes and all child-nodes
 * Remove nodes without `describes` and `its` properties
 *
 * @param {object|object[]} tree
 * @returns {object|object[]}
 */
function cleanUpTree(tree) {
  var type = _getType(tree);
  if (type === 'object') {
    if (get(tree, 'describes.length')) {
      tree.describes = cleanUpTree(tree.describes);
    }
    else {
      delete tree.describes;
    }
    if (!get(tree, 'its.length')) {
      delete tree.its;
    }
  }
  if (type === 'array') {
    var newTree = [];
    for (var i = 0; i < tree.length; i++) {
      var newItem = cleanUpTree(tree[i]);
      if (!get(newItem, 'describes.length') && !get(newItem, 'its.length')) {
        continue;
      }
      newTree.push(newItem);
    }
    return newTree;
  }
  return tree;
}

/**
 * "Unwind" json using `name` property
 * Example:
 * <pre>
 *   var input = [
 *    {name: 'a', describes: [
 *      {name: 'b', its: [
 *        {name: {t: 'c1', title: 'c2', type: 'c3'}},
 *        {name: {t: 'c4', title: 'c5', type: 'c6'}}
 *      ]}
 *    ]}
 *   ];
 *   var result = jsonToTable(input);
 *   console.log(result); // [['a', 'b', {t: 'c1', title: 'c2', type: 'c3'}], ['a', 'b', {t: 'c4', title: 'c5', type: 'c6'}]]
 * </pre>
 * @param {object|object[]} json
 * @returns {object|object[]}
 */
function jsonToTable(json) {
  var ret = [];
  var paths = traverse(json)
    .paths()
    .map(function (path) {
      return path.join('.');
    });

  _removeShortItems(paths)
    .map(function (p) {
      return p.split('.');
    })
    .forEach(function (path) {
      if (path[path.length - 2] !== 'name') {
        return;
      }
      var obj = json;
      var r = [];
      path.forEach(function (subPath) {
        if (obj && obj.name) {
          r.push(obj.name)
        }
        obj = obj[subPath];
      });
      ret.push(r);
    });
  var divider = '#$!@#';
  var newRet = ret
    .map(function (item) {
      return (item).map(function (i) {
        return JSON.stringify(i);
      }).join(divider);
    });
  return _removeShortItems(newRet)
    .map(function(item) {
      return item.split(divider).map(function (i) {
        return JSON.parse(i);
      });
    });
}

/**
 * Print json as table to the console
 * `colors` are used to highlight checkerResult~title (depends on checkerResult~type)
 *
 * @param {string} file
 * @param {object} json
 */
function outputTable(file, json) {
  var formatted = jsonToTable(json);
  var table = new Table();
  var cn = [];
  formatted.forEach(function(row) {
    var newRow = row.map(function (cell) {
      if (_getType(cell) === 'object') {
        var highlight = colors[cell.type];
        return cell.t + ' ' + (highlight ? highlight(cell.title) : cell.title);
      }
      return cell;
    });
    table.push(newRow);
    cn.push(newRow);
  });
  if (formatted.length) {
    return '\n' + file + '\n' + table.toString();
  }
}

module.exports = {
  parseDescribes: parseDescribes,
  outputTable: outputTable
};