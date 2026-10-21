// Base class interface for all dissemination strategies
class IDisseminationChannel {
    getChannelName() {
        throw new Error("getChannelName() must be implemented");
    }

    async send(warning, recipientCount) {
        throw new Error("send() must be implemented");
    }
}

export default IDisseminationChannel;