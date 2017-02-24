import Benchmark from "benchmark";
import { createSelector, createSelectorCreator, defaultMemoize } from "reselect";
import memoizee from "memoizee";

import isEqual from "lodash/isEqual";
import memoize from "lodash/memoize";

const selectorTablesMap = state => state.tablesMap;
const selectorTables = state => state.tables;

const state0 = {
    tablesMap: ["A", "B", "C", "D", "E"],
    tables: {
        A: {
            visible: false,
        },
        B: {
            visible: true,
        },
        C: {
            visible: false,
        },
        D: {
            visible: true,
        },
        E: {
            visible: true,
        },
    },
};

const plainSelectIndexes = (map, tables) => (
    Object.keys(tables).filter(key => tables[key].visible).map(key => map.indexOf(key))
);

const memoizedSelectIndexes = memoize(plainSelectIndexes);
const memoizedSelectIndexes2 = (s) => memoizedSelectIndexes(s.tablesMap, s.tables);

const createDeepEqualSelector = createSelectorCreator(
    memoize,
    isEqual
);

const selectVisibleIndexes2 = createDeepEqualSelector(
    [selectorTablesMap, selectorTables],
    plainSelectIndexes,
);

const selectVisibleIndexes = createSelector(
    [selectorTablesMap, selectorTables],
    plainSelectIndexes,
);

const customCreateSelector = (...a) => {
    const m = memoize(a.pop());
    return s => m.apply(null, a.map(f => f(s)));
};

const myCustom = customCreateSelector(
    selectorTablesMap,
    selectorTables,
    plainSelectIndexes,
);

console.log(selectVisibleIndexes2(state0));
console.log(selectVisibleIndexes2(state0));

const suite = new Benchmark.Suite;

// add tests
suite
    .add("visibleIndexes#selector", function () {
        const l = selectVisibleIndexes(state0);
    })
    .add("visibleIndexes#selectorCustomMemo", function () {
        const l = selectVisibleIndexes(state0);
    })
    .add("visibleIndexes#plain", function () {
        const l = plainSelectIndexes(state0.tablesMap, state0.tables);
    })
    .add("visibleIndexes#memoized", function () {
        const l = memoizedSelectIndexes(state0.tablesMap, state0.tables);
    })
    .add("visibleIndexes#memoized2", function () {
        const l = memoizedSelectIndexes2(state0);
    })
    .add("visibleIndexes#myCustom", function () {
        const l = myCustom(state0);
    })
    // add listeners
    .on("cycle", function (event) {
        console.log(String(event.target));
    })
    .on("complete", function () {
        console.log("Fastest is " + this.filter("fastest").map("name"));
    })
    .run({ "async": true });