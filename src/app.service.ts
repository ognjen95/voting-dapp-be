/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ethers } from 'ethers';
import * as path from 'path';

import { votingaddress } from '../config';
const Voting = require(`${path.resolve(
  __dirname,
  '../../../artifacts/contracts/Voting.sol/Voting.json',
)}`);

const Web3 = require('web3');
const rinkebyUrl =
  'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';

let rpcEndpoint: undefined | string | ConnectionType;
let retryMs = 1000;
@Injectable()
export class AppService {
  async checkForCandidates() {
    const provider1 = new ethers.providers.JsonRpcProvider(rpcEndpoint);
    const votingContract = new ethers.Contract(
      votingaddress,
      Voting.abi,
      provider1,
    );

    const candidateOnBlockchain = await votingContract.checkForCandidates();

    if (!candidateOnBlockchain.length) {
      const {
        data: { candidates },
      } = await axios.get('https://wakanda-task.3327.io/list');
      const indexedCandidateList = candidates.map(
        (item: any, index: number) => ({
          name: ethers.utils.formatBytes32String(item.name),
          cult: ethers.utils.formatBytes32String(item.cult),
          age: item.age,
          candidateId: index,
          voteCount: 0,
        }),
      );

      return {
        candidates: indexedCandidateList,
        isDataFromBc: false,
      };
    }

    const normalData = candidateOnBlockchain.map((candidate: any) => ({
      name: ethers.utils.parseBytes32String(candidate[0]),
      age: ethers.BigNumber.from(candidate[1]).toNumber(),
      cult: ethers.utils.parseBytes32String(candidate[2]),
      voteCount: ethers.BigNumber.from(candidate[3]).toNumber(),
      candidateId: ethers.BigNumber.from(candidate[4]).toNumber(),
    }));

    return {
      candidates: normalData,
      isDataFromBc: true,
    };
  }

  async getWinners() {
    const provider1 = new ethers.providers.JsonRpcProvider(rpcEndpoint);
    const votingContract = new ethers.Contract(
      votingaddress,
      Voting.abi,
      provider1,
    );
    const resp = await votingContract.returnWinners();

    const winners = resp.map((candidate: any) => ({
      name: ethers.utils.parseBytes32String(candidate[0]),
      age: ethers.BigNumber.from(candidate[1]).toNumber(),
      cult: ethers.utils.parseBytes32String(candidate[2]),
      voteCount: ethers.BigNumber.from(candidate[3]).toNumber(),
      candidateId: ethers.BigNumber.from(candidate[4]).toNumber(),
    }));

    return winners;
  }

  async vote(address: string, candidateId: number, amountWKND: number) {
    const web3 = new Web3(
      new Web3.providers.HttpProvider('http://localhost:8545'),
    );
    const votingContract = new web3.eth.Contract(Voting.abi, votingaddress);
    await votingContract.methods
      .vote(candidateId, amountWKND)
      .send({ from: address })
      .on('timeout', () => {
        const retry = () => {
          retryMs = retryMs * 10;
          if (retryMs < 2000000) {
            this.vote(address, candidateId, amountWKND).catch((err) => {
              console.log(err);
            });
          }
        };

        setTimeout(retry, retryMs);
      });
  }
}
