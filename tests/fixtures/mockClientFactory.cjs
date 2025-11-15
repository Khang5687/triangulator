class MockStream {
  constructor(response) {
    this.response = response;
    this.sent = false;
  }

  [Symbol.asyncIterator]() {
    const events = [
      {
        type: 'response.output_text.delta',
        response_id: this.response.id,
        output_index: 0,
        item_index: 0,
        delta: 'Mock answer text.',
      },
    ];
    let index = 0;
    return {
      next: async () => {
        if (index >= events.length) {
          return { done: true, value: undefined };
        }
        const value = events[index];
        index += 1;
        return { done: false, value };
      },
    };
  }

  async finalResponse() {
    return this.response;
  }

  abort() {}
}

function mockClientFactory() {
  return {
    responses: {
      stream: async (body) => {
        const response = {
          id: 'mock-response',
          status: 'completed',
          usage: {
            input_tokens: 12,
            output_tokens: 8,
            reasoning_tokens: 0,
            total_tokens: 20,
          },
          output: [
            {
              type: 'message',
              content: [{ type: 'text', text: `Echo: ${body.input?.[0]?.content?.[0]?.text ?? ''}` }],
            },
          ],
          _request_id: 'mock-req',
        };
        return new MockStream(response);
      },
      create: async () => {
        throw new Error('Background mode not supported in mock client');
      },
      retrieve: async () => {
        throw new Error('Retrieve not supported in mock client');
      },
    },
  };
}

module.exports = mockClientFactory;
module.exports.default = mockClientFactory;
