module.exports = {
    Platform: {
        OS: 'ios',
        select: (objs) => objs.ios || objs.default,
    },
    StyleSheet: {
        create: (styles) => styles,
    },
    Alert: {
        alert: jest.fn(),
    },
};
