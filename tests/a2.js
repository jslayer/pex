var Plugins = {},
    A2;

/**
 * @param {Object?} cfg
 * @constructor
 */
function Base(cfg){
    var args = arguments,
        l = this,
        i,
        _attrs = {};

    this._listeners = {};

    //create parents chain
    this._chain = [];

    do {
        this._chain.unshift(l);
    } while (l = l.constructor.__super__);

    //collect & process ATTRS information
    this._chain.map(function(o){
        var i,
            attrs = o.constructor.ATTRS;

        if (attrs) {
            for (i in attrs) {
                _attrs[i] = attrs[i];
            }
        }
    }, this);

    for (i in cfg) {
        if (!_attrs[i]) {
            _attrs[i] = {};
        }
        _attrs[i].value = cfg[i];
    }

    for (i in _attrs) {
        this.define(i, _attrs[i]);
    }

    for (i = 0, l = this._exs.length; i < l; i++) {
        this._exs[i].apply(this, arguments);
    }

    this._plugins = [];

    //call initializer of each chain item
    this._chain.map(function(o){
        if (o.initializer) {
            o.initializer.apply(this, args);
        }
    }, this);
}

/**
 * @param {string} name
 * @param {Function} P
 * @param {Object?} px
 * @param {Object?} sx
 * @returns {Function}
 */
Base.extend = function(name, P, ex, px, sx){
    var C, F, i, l, ii;

    F = function(){
    };

    C = function(){
        P.apply(this, arguments);
    };

    F.prototype = P.prototype;
    C.prototype = new F();

    for (i in sx) {
        C[i] = sx[i];
    }

    C.prototype._exs = ex;

    //extend the prototype with method from extensions
    for (i = 0, l = ex.length; i < l; i++) {
        for (ii in ex[i].prototype) {
            if (ex[i].prototype.hasOwnProperty(ii)) {
                C.prototype[ii] = ex[i].prototype[ii];
            }
        }
    }

    for (i in px) {
        C.prototype[i] = px[i];
    }

    C.__super__ = P.prototype;
    C.prototype.constructor = C;
    C.NAME = name;

    return C;
};

/**
 * @type {{on: Function, off: Function}}
 */
Base.Node = {
    /**
     * @param node
     * @param type
     * @param fn
     * @param capture
     * @returns {*}
     */
    on : function(node, type, fn, capture){
        var i, l, types;

        types = type.split(' ');

        for (i = 0, l = types.length; i < l; i++) {
            node.addEventListener(types[i], fn, capture || false);
        }

        return this;
    },

    /**
     * @param node
     * @param type
     * @param fn
     * @param capture
     * @returns {*}
     */
    off : function(node, type, fn, capture){
        var i, l, types;

        types = type.split(' ');

        for (i = 0, l = types; i < l; i++) {
            node.removeEventListener(types[i], fn, capture || false);
        }

        return this;
    },

    /**
     * @param {Element} node
     * @returns {boolean}
     */
    haveFocus : function(node){
        return document.activeElement && node === document.activeElement ? true : false;
    }
};

/**
 * @param {string} name
 * @param {object?} attrs
 */
Base.prototype.define = function(name, attrs){
    var value, _set, _get;

    Object.defineProperty(this, name, {
        set : function(nv){
            var old = value;

            value = _set ? _set.call(this, nv, name) : nv;

            this.emit({
                name   : name,
                type   : 'change',
                data   : {
                    newVal : nv,
                    oldVal : old
                },
                target : this
            });

            re.call(this, value, name);

            return value;
        },
        get : function(){
            return _get ? _get.call(this, value, name) : value;
        }
    });

    if (attrs) {
        if (typeof attrs.value !== 'undefined') {
            if (Object.prototype.toString.call(attrs.value) === '[object Object]') {
                this[name] = Object.create(attrs.value);
            }
            else {
                this[name] = attrs.value;
            }
        }
    }

    function re(o, pName){
        var i, l,
            self = this;

        switch (Object.prototype.toString.call(o)) {
            case '[object Object]':
                for (i in o) {
                    (function(){
                        var value = o[i],
                            name = [pName, i].join('.');

                        Object.defineProperty(o, i, {
                            get : function(){
                                return _get ? _get.call(self, value, name) : value;
                            },
                            set : function(nv){
                                var old = value;

                                value = _set ? _set.call(this, nv, name) : nv;

                                self.emit({
                                    name   : name,
                                    type   : 'change',
                                    data   : {
                                        newVal : nv,
                                        oldVal : old
                                    },
                                    target : self
                                });

                                re.call(self, value, name);

                                return value;
                            }
                        });

                        o[i] = value;
                    })();
                }
                break;
            case '[object Array]':
                o.pop = function(){
                    var out;

                    out = Array.prototype.pop.apply(this, arguments);

                    self.emit({
                        name   : pName,
                        type   : 'pop',
                        data   : {
                            newVal : this
                        },
                        target : self
                    });

                    rea(self, o, pName);

                    return out;
                };

                o.push = function(){
                    var out;

                    out = Array.prototype.push.apply(this, arguments);

                    self.emit({
                        name   : pName,
                        type   : 'push',
                        data   : {
                            newVal : Array.prototype.slice.call(this, 0)
                        },
                        target : self
                    });

                    rea(self, o, pName);

                    return out;
                };

                o.reverse = function(){
                    //todo - implement
                    return Array.prototype.reverse.apply(this, arguments);
                };

                o.shift = function(){
                    //todo - implement
                    return Array.prototype.shift.apply(this, arguments);
                };

                o.sort = function(){
                    //todo - implement
                    return Array.prototype.sort.apply(this, arguments);
                };

                o.splice = function(i, l){
                    //todo - implement 3+ params (new elements)
                    var out;

                    out = Array.prototype.splice.apply(this, arguments);

                    self.emit({
                        name   : pName,
                        type   : 'splice',
                        data   : {
                            index  : i,
                            length : l
                        },
                        target : self
                    });

                    return out;
                };

                o.unshift = function(){
                    //todo - implement
                    return Array.prototype.unshift.apply(this, arguments);
                };

                rea(self, o, pName);

                break;
        }
    }

    function rea(self, o, pName){
        var l, i;

        for (i = 0, l = o.length; i < l; i++) {
            re.call(self, o[i], [pName, i].join('.'));

            (function(){
                var value = o[i],
                    name = [pName, i].join('.');

                Object.defineProperty(o, i, {
                    get : function(){
                        return _get ? _get.call(self, value, name) : value;
                    },
                    set : function(nv){
                        var old = value;

                        value = _set ? _set.call(this, nv, name) : nv;

                        self.emit({
                            name   : name,
                            type   : 'change',
                            data   : {
                                newVal : nv,
                                oldVal : old
                            },
                            target : self
                        });

                        //re.call(self, value, name);

                        return value;
                    }
                });
            })();
        }
    }

    return this;
};

/**
 * @param {string} name
 * @param {Function} cb
 * @param {object?} context
 * @returns {{cb: *, ctx: *}}
 */
Base.prototype.listen = function(name, cb, context){
    if (!this._listeners[name]) {
        this._listeners[name] = [];
    }

    var listener = {
        cb  : cb,
        ctx : context
    };

    this._listeners[name].push(listener);

    return listener;
};

Base.prototype.emit = function(e){
    if (e.type === 'change' && e.data.newVal === e.data.oldVal) {
        return;
    }
    var listeners = this._listeners[e.name] || [];

    if (e.type === 'splice') {
        if (this._listeners[[e.name, '$index'].join('.')]) {
            listeners = listeners.concat(this._listeners[[e.name, '$index'].join('.')]);
        }
    }

    if (listeners) {
        listeners.forEach(function(ltr){
            ltr.cb.call(ltr.ctx || this, e);
        }, this);
    }
};

Base.prototype.detach = function(listener){
    //todo - implement
};

/*** ----------------------------------- ***/

/**
 * Plugin extension
 * @constructor
 */
function Plugin(){
    //console.log('PLUGIN EXTENSION');
}

Plugin.prototype.plug = function(C){
    this._plugins.push(C.NAME);

    this[C.NAME] = new C(this, arguments[1]);
};

A2 = Base.extend('A2', Base, [Plugin], {
    initializer : function(){

    },

    init : function(){
        this.processTree(
            this.parse(this.node)
        );
    },

    processTree : function(tree){
        var i;

        if (tree.cfg) {
            for (i in tree.cfg) {
                this[i].process(tree, tree.cfg[i]);
            }
        }

        if (tree.children) {
            for (i in tree.children) {
                this.processTree(tree.children[i]);
            }
        }

    },

    parse : function(node, parent){
        var i, l, tree, child, children, go, notDive;

        tree = {
            node   : node,
            parent : parent || false
        };

        var dive = true, plugin;

        for (i = 0, l = this._plugins.length; i < l; i++) {
            plugin = this[this._plugins[i]];

            dive &= (plugin && plugin.validate ? !plugin.validate(tree) : true);
        }

        children = node.childNodes;

        if (dive && children && children.length > 0) {
            tree.children = [];

            for (i = 0, l = children.length; i < l; i++) {
                child = children[i];

                go = false;

                switch (child.nodeType) {
                    case 1://Element Node
                        go = true;
                        break;
                    case 3://Text Node
                        if (child.textContent.trim().length > 0) {
                            go = true;
                        }
                        break;
                }

                if (go) {
                    tree.children.push(
                        this.parse(child, tree)
                    );
                }
            }
        }

        return tree;
    },

    /**
     * @param tree
     * @param plugin
     * @param data
     */
    setConfig : function(tree, plugin, data){
        if (!tree.cfg) {
            tree.cfg = {};
        }

        tree.cfg[plugin.constructor.NAME] = data;
    },

    /**
     * @param tree
     * @param plugin
     * @returns {boolean}
     */
    getConfig : function(tree, plugin){
        var result = false;

        if (tree.cfg && tree.cfg[plugin.constructor.NAME]) {
            result = tree.cfg[plugin.constructor.NAME];
        }

        return result;
    },

    resolveValue : function(name, tree){
        var value, tmp = tree, parts, i, l;

        if (~name.indexOf('.')) {
            parts = name.split('.');
            name = parts.shift();
        }

        if (parts && parts.length === 1 && parts[0] === '$index') {
            name = parts.shift();
        }

        while (tmp.parent) {
            if (tmp.closure && typeof tmp.closure[name] !== 'undefined') {
                value = tmp.closure[name];
                break;
            }
            tmp = tmp.parent;
        }

        if (parts) {
            for (i = 0, l = parts.length; i < l; i++) {
                if (typeof value[parts[i]] !== 'undefined') {
                    value = value[parts[i]];
                }
                else {
                    value = '';
                }
            }
        }

        if (typeof value === 'undefined' && typeof this[name] !== 'undefined') {
            value = this[name];
        }

        return value;
    },

    resolveModelName : function(name, tree){
        var tmp = tree, suffix, parts;

        if (~name.indexOf('.')) {
            parts = name.split('.');
            name = parts.shift();
            suffix = parts.join('.');
        }

        while (tmp.parent) {
            if (tmp.closure) {
                if (name === '$model') {
                    break;
                }
                if (~[tmp.closure['$__key'], '$index'].indexOf(name)) {
                    name = [tmp.closure['$model'], '$index'].join('.');
                    break;
                }
                if (typeof tmp.closure['$index'] !== 'undefined' && typeof tmp.closure['$model'] !== 'undefined') {
                    if (tmp.closure['$model'] !== name) {
                        name = [tmp.closure['$model'], tmp.closure['$index']].join('.');
                    }
                    break;
                }
            }
            tmp = tmp.parent;
        }

        if (suffix) {
            name = [name, suffix].join('.');
        }

        return name;
    },

    //todo - extend (use lex)
    resolveCallback  : function(raw, tree){
        var parts, out, i, l;

        parts = raw.split(/[,\s]+/);

        out = {
            method : parts.shift(),
            args   : []
        };

        for (i = 0, l = parts.length; i < l; i++) {
            switch (parts[i]) {
                case 'false':
                    out.args.push(false);
                    break;
                case 'true':
                    out.args.push(true);
                    break;
                case 'null':
                    out.args.push(true);
                    break;
                default :
                    if (parseFloat(parts[i]).toString() === parts[i]) {
                        out.args.push(parseFloat(parts[i]));
                    }
                    else {
                        out.args.push(
                            this.resolveValue(
                                this.resolveModelName(parts[i], tree),
                                tree
                            )
                        );
                    }
            }
        }

        return out;
    },

    setValue : function(name, value){
        var i, l, parts = name.split('.'), link = this, key;

        key = parts.pop();

        for (i = 0, l = parts.length; i < l; i++) {
            if (typeof link[parts[i]] != 'undefined') {
                link = link[parts[i]];
            }
        }

        link[key] = value;
    }
}, {
    ATTRS  : {
        node : null
    },
    PREFIX : 'a2'
});

function PluginBase(){
    this.host = arguments[0];

    if (this.initializer) {
        this.initializer.apply(this, arguments);
    }
}

Plugins.PluginNodeForIn = Base.extend('PluginNodeForIn', PluginBase, [], {
    validate : function(tree){
        var result = false,
            node = tree.node,
            attrValue = node.getAttribute && node.getAttribute([
                this.host.constructor.PREFIX,
                this.constructor.SUFFIX
            ].join('-'));

        if (attrValue) {
            this._pre(tree, attrValue);
            result = true;
        }

        return result;
    },

    _pre : function(tree, value){
        var parts, rawTpl = [], tpl = [], i, l, append, cfg;

        parts = value.match(/(\w+)\s*(?:,\s*(.))?\s+in\s+(\w+)/).slice(1);

        if (tree.node.tagName === 'TABLE') {
            rawTpl = tree.node.querySelector('tbody');
            //rawTpl = tree.node.tBodies.length > 0 ? tree.node.tBodies[0] : [];

            if (rawTpl) {
                append = rawTpl.cloneNode(false);
                rawTpl = Array.prototype.splice.call(rawTpl.childNodes, 0);
            }
        }
        else {
            rawTpl = Array.prototype.splice.call(tree.node.childNodes, 0);
        }

        for (i = 0, l = rawTpl.length; i < l; i++) {
            tpl.push(rawTpl[i]);
        }

        cfg = {
            name  : parts[0],
            key   : parts[1],
            model : parts[2],
            tpl   : tpl
        };

        this.host.setConfig(tree, this, cfg);

        tree.closure = tree.closure || {};

        tree.closure['$model'] = cfg.model;
        tree.closure['$__key'] = cfg.key;

        //todo - change this
        tree.node.innerHTML = '';

        if (append) {
            tree.node.appendChild(append);
        }
    },

    process : function(tree, cfg){
        //todo - if node is select & it have model attr - the model value could change after list changes
        
        var target,
            self = this;

        if (!(cfg.model in this.host)) {
            this.host.define(cfg.model, {
                value : []
            });
        }
        else {
            this.generate(tree, cfg);
        }

        this.host.listen(this.host.resolveModelName(cfg.model, tree), function(e){
            var value, item, i, l;

            console.log(e);

            switch (e.type) {
                case 'change':
                    this.generate(tree, cfg);
                    break;
                case 'splice':
                    //collect elements to remove

                    target = tree.node;

                    if (target.tagName === 'TABLE' && target.tBodies.length > 0) {
                        target = target.tBodies[0];
                    }

                    var _ix = {
                        s : e.data.index * cfg.tpl.length,
                        e : e.data.index * cfg.tpl.length + e.data.length * cfg.tpl.length
                    };

                    var _rList = Array.prototype.slice.call(target.childNodes, _ix.s, _ix.e);

                    for (i = 0, l = _rList.length; i < l; i++) {
                        target.removeChild(_rList[i]);
                    }

                    tree.children.splice(e.data.index, e.data.length);

                    for (i = 0, l = tree.children.length; i < l; i++) {
                        //update indexes
                        tree.children[i].closure['$index'] = i;

                        if (cfg.key) {
                            tree.children[i].closure[cfg.key] = i;
                        }
                    }
                    break;
                case 'push':
                    value = e.data.newVal[e.data.newVal.length - 1];

                    item = this._parseElement(tree, cfg, value, e.data.newVal.length - 1);

                    target = tree.node;

                    if (target.tagName === 'TABLE' && target.tBodies.length > 0) {
                        target = target.tBodies[0];
                    }

                    tree.children.push(item);

                    target.appendChild(item.node);
                    break;
            }
        }, this);
    },

    generate : function(tree, cfg){
        var i, l, frag, list = this.host[cfg.model], target;

        if (list && list.length) {
            tree.children = [];

            for (i = 0, l = list.length; i < l; i++) {
                tree.children.push(
                    this._parseElement(tree, cfg, list[i], i)
                );
            }

            frag = document.createDocumentFragment();

            for (i = 0, l = tree.children.length; i < l; i++) {
                frag.appendChild(tree.children[i].node);
            }

            target = tree.node;

            if (target.tagName === 'TABLE' && target.tBodies.length > 0) {
                target = target.tBodies[0];
            }

            target.appendChild(frag);
        }
    },

    _parseElement : function(tree, cfg, value, index){
        var i, l,
            frag,
            item,
            closure = {};

        closure['$index'] = index;
        closure['$model'] = cfg.model;
        closure[cfg.name] = value;
        closure['$__key'] = cfg.key;

        frag = document.createDocumentFragment();

        for (i = 0, l = cfg.tpl.length; i < l; i++) {
            frag.appendChild(
                cfg.tpl[i].cloneNode(true)
            );
        }

        item = this.host.parse(frag, tree);

        item.closure = closure;
        item.parent = tree;

        this.host.processTree(item);

        return item;
    },

    _resolveTarget : function(){
        //todo - implement
    }
}, {
    SUFFIX : 'for'
});

Plugins.PluginNodeText = Base.extend('PluginNodeText', PluginBase, [], {
    validate : function(tree){
        var i, ii, ll, child, texts, frag, match;

        switch (tree.node.nodeType) {
            case 1://Node
                /**
                 * Go through the child & split texts into parts
                 */

                for (i = tree.node.childNodes.length - 1; i >= 0; i--) {
                    child = tree.node.childNodes[i];

                    if (child.nodeType === 3) {
                        frag = document.createDocumentFragment();

                        texts = child.textContent.split(/({{\s*[a-zA-Z.0-9$]+\s*}})/g);

                        for (ii = 0, ll = texts.length; ii < ll; ii++) {
                            frag.appendChild(document.createTextNode(texts[ii]));
                        }

                        tree.node.replaceChild(frag, child);
                    }
                }
                break;
            case 3:
                match = tree.node.textContent.match(/{{\s*([a-zA-Z.0-9$]+)\s*}}/);//todo - change

                if (match && match.length === 2) {
                    this.host.setConfig(tree, this, this.host.resolveModelName(match[1], tree));

                    tree.node.textContent = '';
                }
                break;
        }
    },

    process : function(tree, modelName){
        var host = this.host;

        if (typeof host.resolveValue(modelName, tree) === 'undefined') {
            host.define(modelName, {
                value : ''
            });
        }
        else {
            tree.node.textContent = host.resolveValue(modelName, tree);
        }

        host.listen(host.resolveModelName(modelName, tree), function(e){
            switch (e.type) {
                case 'splice':
                    tree.node.textContent = host.resolveValue(modelName, tree);
                    break;
                default:
                    tree.node.textContent = e.data.newVal;
            }
        });
    }
});

Plugins.PluginNodeModel = Base.extend('PluginNodeModel', PluginBase, [], {
    validate : function(tree){
        var model, type;

        if (~['INPUT', 'SELECT', 'OPTION'].indexOf(tree.node.tagName)) {
            model = tree.node.getAttribute([
                this.host.constructor.PREFIX,
                this.constructor.SUFFIX
            ].join('-'));

            if (model) {

                switch (tree.node.tagName) {
                    case 'SELECT':
                        type = 'select';
                        break;
                    case 'OPTION':
                        type = 'option';
                        break;
                    case 'INPUT':
                        type = tree.node.type;
                        break;
                }

                this.host.setConfig(tree, this, {
                    model : this.host.resolveModelName(model, tree),
                    type  : type
                });
            }
        }
    },

    process : function(tree, data){
        var host = this.host,
            model = data.model,
            initialValue,
            modelDefined;

        initialValue = host.resolveValue(model, tree);

        modelDefined = typeof initialValue !== 'undefined';

        switch (data.type) {
            case 'text':
                Base.Node.on(tree.node, 'input', function(e){
                    host.setValue(host.resolveModelName(model, tree), e.target.value);
                });

                host.listen(host.resolveModelName(model, tree), function(e){
                    var ss, se;

                    if (Base.Node.haveFocus(tree.node)) {
                        ss = tree.node.selectionStart;
                        se = tree.node.selectionEnd;
                    }

                    tree.node.value = e.data.newVal;

                    if (typeof ss !== 'undefined' && typeof se !== 'undefined') {
                        tree.node.selectionStart = ss;
                        tree.node.selectionEnd = se;
                    }
                });
                break;
            case 'checkbox':
                Base.Node.on(tree.node, 'change', function(e){
                    host.setValue(host.resolveModelName(model, tree), e.target.checked ? e.target.value : false);
                });

                host.listen(host.resolveModelName(model, tree), function(e){
                    tree.node.checked = !!host.resolveValue(model, tree);
                });

                if (modelDefined) {
                    tree.node.checked = !!initialValue;
                }
                else {
                    initialValue = tree.node.checked ? tree.node.value : false;
                }
                break;
            case 'option':
                host.listen(host.resolveModelName(model, tree), function(e){
                    tree.node.value = host.resolveValue(model, tree);
                });
                break;
            case 'select':
                Base.Node.on(tree.node, 'change', function(e){
                    host.setValue(host.resolveModelName(model, tree), e.target.value);
                });

                host.listen(host.resolveModelName(model, tree), function(e){
                    console.log(e);
                    tree.node.value = e.data.newVal;
                });
                break;
        }

        if (typeof initialValue === 'undefined') {
            initialValue = '';
        }

        if (!modelDefined) {
            host.define(model, {
                value : initialValue
            });
        }
        else {
            tree.node.value = initialValue;
        }
    }
}, {
    SUFFIX : 'model'
});

Plugins.PluginNodeEnter = Base.extend('PluginNodeEnter', PluginBase, [], {
    validate : function(tree){
        if (tree.node.nodeType === 1) {
            var enter = tree.node.getAttribute([
                this.host.constructor.PREFIX,
                this.constructor.SUFFIX
            ].join('-'));

            if (enter) {
                this.host.setConfig(tree, this, enter);
            }
        }
    },

    process : function(tree, enter){
        var host = this.host;

        Base.Node.on(tree.node, 'keydown', function(e){
            if (e.which === 13) {
                if (typeof host[enter] === 'function') {
                    host[enter](tree);
                }
            }
        });

    }
}, {
    SUFFIX : 'enter'
});

Plugins.PluginNodeClick = Base.extend('PluginNodeClick', PluginBase, [], {
    validate : function(tree){
        if (tree.node.nodeType === 1) {
            var click = tree.node.getAttribute([
                this.host.constructor.PREFIX,
                this.constructor.SUFFIX
            ].join('-'));

            if (click) {
                this.host.setConfig(tree, this, click);
            }
        }
    },

    process : function(tree, click){
        var host = this.host;

        Base.Node.on(tree.node, 'click', function(e){
            var cbi = host.resolveCallback(click, tree);

            if (cbi) {
                host[cbi.method].apply(host, cbi.args);
            }
        });

    }
}, {
    SUFFIX : 'click'
});

Plugins.PluginNodeDisplayAbstract = Base.extend('PluginNodeDisplayAbstract', PluginBase, [], {
    validate : function(tree){
        if (tree.node.nodeType === 1) {
            var model = tree.node.getAttribute([
                this.host.constructor.PREFIX,
                this.constructor.SUFFIX
            ].join('-'));

            if (model) {
                this.host.setConfig(tree, this, {
                    model   : model,
                    display : window.getComputedStyle(tree.node, null).getPropertyValue("display")
                });
            }
        }
    },

    _update : function(node, cfg, show){
        var defaultVisible, value;

        if (show) {
            if (cfg.display !== 'none') {
                defaultVisible = cfg.display;
            }
            else {
                switch (node.tagName) {
                    case 'TABLE':
                        defaultVisible = 'table';
                        break;
                    case 'LI':
                        defaultVisible = 'list-item';
                        break;
                    default :
                        defaultVisible = 'block';
                }
            }

            value = cfg.display !== 'none' ? cfg.display : defaultVisible;
        }
        else {
            value = 'none';
        }

        node.style.display = value;
    }
});

Plugins.PluginNodeShow = Base.extend('PluginNodeShow', Plugins.PluginNodeDisplayAbstract, [], {
    process : function(tree, data){
        var host = this.host,
            plugin = this;

        host.listen(host.resolveModelName(data.model, tree), function(e){
            plugin._update(tree.node, data, host.resolveValue(data.model, tree));
        });

        plugin._update(tree.node, data, host.resolveValue(data.model, tree));
    }
}, {
    SUFFIX : 'show'
});

Plugins.PluginNodeHide = Base.extend('PluginNodeHide', Plugins.PluginNodeDisplayAbstract, [], {
    process : function(tree, data){
        var host = this.host,
            plugin = this;

        host.listen(host.resolveModelName(data.model, tree), function(e){
            plugin._update(tree.node, data, !host.resolveValue(data.model, tree));
        });

        plugin._update(tree.node, data, !host.resolveValue(data.model, tree));
    }
}, {
    SUFFIX : 'hide'
});
