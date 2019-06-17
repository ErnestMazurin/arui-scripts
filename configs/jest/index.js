const configs = require('../app-configs');
const merge = require('lodash.mergeWith');
const { arrayConcatCustomizer } = require('../util/merge-customizers');

const defaultJestConfig = {
    testRegex: 'src/.*(test|spec|/__test__/|/__tests__/).*\\.(jsx?|tsx?)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}'
    ],
    // transform project js and ts files using babel ant ts transformers
    transform: {
        '^.+\\.jsx?$': require.resolve('./babel-transform'),
        '^.+\\.tsx?$': require.resolve('ts-jest'),
        // transform other files to simple empty strings
        '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': require.resolve('./file-transform')
    },
    moduleNameMapper: {
        // replace all css files with simple empty exports
        '\\.css$': require.resolve('./css-mock')
    },
    setupFiles: [
        require.resolve('./setup')
    ],
    snapshotSerializers: [
        require.resolve('jest-snapshot-serializer-class-name-to-string')
    ],
    globals: {
        'ts-jest': {
            tsConfig: configs.tsconfig
        }
    }
};

let appJestConfig = {};
if (configs.appPackage.jest) {
    appJestConfig = configs.appPackage.jest;
    if (appJestConfig.preset) { // we don't need presets when using presets
        if (appJestConfig.preset !== 'arui-scripts') {
            console.warn('arui-scripts test command doesn\'t support jest preset config');
        }
        delete appJestConfig.preset;
    }
}

module.exports = mergeWith(defaultJestConfig, appJestConfig, arrayConcatCustomizer);
