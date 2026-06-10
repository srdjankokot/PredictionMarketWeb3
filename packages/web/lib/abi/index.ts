/**
 * Contract ABIs imported DIRECTLY from the compiled artifacts in
 * packages/contracts/artifacts — no manual copying. Run `npm run compile`
 * before building/running the web app so these files exist.
 */
import type { Abi } from 'viem';
import PredictionMarketArtifact from '../../../contracts/artifacts/contracts/PredictionMarket.sol/PredictionMarket.json';
import MockUSDCArtifact from '../../../contracts/artifacts/contracts/MockUSDC.sol/MockUSDC.json';

export const PredictionMarketABI = PredictionMarketArtifact.abi as Abi;
export const MockUSDCABI = MockUSDCArtifact.abi as Abi;

/** Minimal ERC20 surface the app needs (allowance / approve / balanceOf). */
export const ERC20ABI = MockUSDCABI;
