const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

const controller = require('../../api/controllers/cards/show');

describe('card show socket subscription', () => {
  it('offers an explicit subscription input and only joins from a socket request', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../api/controllers/cards/show.js'),
      'utf8',
    );

    expect(controller.inputs.subscribe).to.deep.equal({ type: 'boolean' });
    expect(source).to.include('if (inputs.subscribe && this.req.isSocket)');
    expect(source).to.include('sails.sockets.join(this.req, `board:${card.boardId}`)');
  });
});
