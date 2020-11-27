const t = require('../contract-dist')

const tx = {
    version: '1',
    type: '17',
    nonce: 5,
    from: '5b7514a3d3337022cfaf9619b8d7dc8c5fbbb3c3d942ded3ee240248c0550ad8',
    gasPrice: '100',
    amount: '0',
    payload: 'd580877365744e616d65cbc104c78679756e6d696ec0',
    to: 'b2dab0ef995f41325cf58ab9ae26b3e17a04c4fe',
    signature: ''
}


console.log(t.bin2hex(t.Transaction.clone(tx).getRaw(true)))