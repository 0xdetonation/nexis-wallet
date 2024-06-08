import { type ReactElement, type ReactNode, Suspense, useMemo, useEffect, useState } from "react";
import type { Blockchain } from "@coral-xyz/common";
import { hiddenTokenAddresses } from "@coral-xyz/recoil";
import { YStack } from "@coral-xyz/tamagui";
import { useRecoilValue } from "recoil";

import { gql } from "../../apollo";
import type { ProviderId } from "../../apollo/graphql";
import { usePolledSuspenseQuery } from "../../hooks";
import type { DataComponentScreenProps } from "../common";

import type { BalanceDetailsProps } from "./BalanceDetails";
import { BalancesTable } from "./BalancesTable";
import {
  BalanceSummary,
  BalanceSummaryLoader,
  type BalanceSummaryProps,
} from "./BalanceSummary";
import type { ResponseBalanceSummary, ResponseTokenBalance } from "./utils";

export type { ResponseBalanceSummary, ResponseTokenBalance };
export { BalanceDetails, type BalanceDetailsProps } from "./BalanceDetails";

const DEFAULT_POLLING_INTERVAL_SECONDS = 60;

export { GET_TRANSACTIONS_FOR_TOKEN } from "./BalanceDetails";
export const GET_TOKEN_BALANCES_QUERY = gql(`
  query GetTokenBalances($address: String!, $providerId: ProviderID!) {
    wallet(address: $address, providerId: $providerId) {
      id
      balances {
        id
        aggregate {
          id
          percentChange
          value
          valueChange
        }
        tokens {
          edges {
            node {
              id
              address
              displayAmount
              marketData {
                id
                percentChange
                value
                valueChange
              }
              token
              tokenListEntry {
                id
                address
                logo
                name
                symbol
              }
            }
          }
        }
      }
    }
  }
`);

export type TokenBalancesProps = DataComponentScreenProps & {
  address: string;
  onItemClick?: (args: {
    id: string;
    balance: BalanceDetailsProps["balance"];
    displayAmount: string;
    symbol: string;
    token: string;
    tokenAccount: string;
  }) => void | Promise<void>;
  providerId: ProviderId;
  summaryStyle?: BalanceSummaryProps["style"];
  tableFooterComponent?: ReactElement;
  tableLoaderComponent: ReactNode;
  widgets?: ReactNode;
};

export const TokenBalances = ({
  tableLoaderComponent,
  ...rest
}: TokenBalancesProps) => (
  <Suspense
    fallback={
      <YStack
        alignItems="center"
        gap={30}
        marginHorizontal={16}
        marginVertical={20}
      >
        <BalanceSummaryLoader />
        {tableLoaderComponent}
      </YStack>
    }
  >
    <_TokenBalances {...rest} />
  </Suspense>
);

function _TokenBalances({
  address,
  fetchPolicy,
  onItemClick,
  pollingIntervalSeconds,
  providerId,
  summaryStyle,
  tableFooterComponent,
  widgets,
}: Omit<TokenBalancesProps, "tableLoaderComponent">) {
  const hidden = useRecoilValue(
    hiddenTokenAddresses(providerId.toLowerCase() as Blockchain)
  );

  const ZERO_ADDRESS="0x0000000000000000000000000000000000000000";
  const [data,setData] = useState([]);
  const [nztBal,setNztBal] = useState({
    id: ZERO_ADDRESS,
        address: ZERO_ADDRESS,
        displayAmount: (0 / Math.pow(10, 18)).toString(),
        token: "Nexis",
        marketData: {
          id: "",
          percentChange: 0,
          value: 1,
          valueChange: 0,
        },
        tokenListEntry:{
          id: ZERO_ADDRESS,
          address: ZERO_ADDRESS,
          logo: "https://raw.githubusercontent.com/Nexis-Network/Nexis-Brand-Kit/main/Mask%20group%20(1).png",
          name: "Nexis",
          symbol: "NZT",
        }
  });

  useEffect(()=>{
    const url = `https://evm-testnet.nexscan.io/api/v2/addresses/0x77542Fe67d92eD60F94e2396A7A077D0461a7Dd5/token-balances`;

    const fetchBalances = async()=>{
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        let data = await response.json();

        setData(data);
      } catch (error) {
        console.error('Error fetching token balances:', error);
      }
    }
    fetchBalances();
  },[])

  useEffect(()=>{
    const url = `https://evm-testnet.nexscan.io/api/v2/addresses/0x77542Fe67d92eD60F94e2396A7A077D0461a7Dd5`;

    const fetchNZTBalance = async()=>{
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        let data = await response.json();

        setNztBal({
          id: ZERO_ADDRESS,
              address: ZERO_ADDRESS,
              displayAmount: (data.coin_balance / Math.pow(10, 18)).toString(),
              token: "Nexis",
              marketData: {
                id: ZERO_ADDRESS,
                percentChange: 0,
                value: 1,
                valueChange: 0,
              },tokenListEntry:{
                id: ZERO_ADDRESS,
                address: ZERO_ADDRESS,
                logo: "https://raw.githubusercontent.com/Nexis-Network/Nexis-Brand-Kit/main/Mask%20group%20(1).png",
                name: "Nexis",
                symbol: "NZT",
              }
        })
      } catch (error) {
        console.error('Error fetching token balances:', error);
      }
    }
    fetchNZTBalance();
  },[])
  
  // const { data } = usePolledSuspenseQuery(
  //   pollingIntervalSeconds ?? DEFAULT_POLLING_INTERVAL_SECONDS,
  //   GET_TOKEN_BALANCES_QUERY,
  //   {
  //     fetchPolicy,
  //     errorPolicy: "all",
  //     variables: {
  //       address,
  //       providerId,
  //     },
  //   }
  // );

  /**
   * Memoized value of the individual wallet token balances that
   * returned from the GraphQL query for the page. Also calculates the
   * monetary value and value change to be omitted from the total balance
   * aggregation based on the user's hidden token settings.
   */
  const { balances, omissions } = useMemo<{
    balances: ResponseTokenBalance[];
    omissions: { value: number; valueChange: number };
  }>(() => {
    let balances = data
      .filter((item: any) => item.token.type === "ERC-20")
      .map((item:any) => ({
        id: item.token.address,
        address: item.token.address,
        displayAmount: (item.value / Math.pow(10, item.token.decimals)).toString(),
        token: item.token.name + "( "+item.token.symbol +" )",
        marketData: {
          id: item.token.address,
          percentChange: 0,
          value: 0,
          valueChange: 0,
        },
        tokenListEntry:{
          id: item.token.address,
          address: item.token.address,
          logo: "https://raw.githubusercontent.com/Nexis-Network/Nexis-Brand-Kit/main/NZT%20token%20logo%20light.png",
          name: item.token.name,
          symbol: item.token.symbol,
        }
      }));

    const omissions = { value: 0, valueChange: 0 };
    if (hidden && hidden.length > 0) {
      balances = balances.filter((b:any) => {
        if (hidden.includes(b.token)) {
          omissions.value += b.marketData?.value ?? 0;
          omissions.valueChange += b.marketData?.valueChange ?? 0;
          return false;
        }
        return true;
      });
    }

    return { balances, omissions };
  }, [data, hidden]);

  /**
   * Memoized value of the inner balance summary aggregate
   * returned from the GraphQL query for the page.
   */
  const aggregate = useMemo(() => {
    const aggregate = {
      id: "",
      percentChange: 0,
      value: 0,
      valueChange: 0,
    };

    balances.forEach((balance:any) => {
      aggregate.value += balance.marketData.value;
      aggregate.valueChange += balance.marketData.valueChange;
    });

    aggregate.value -= omissions.value;
    aggregate.valueChange -= omissions.valueChange;

    return aggregate;
  }, [data, omissions]);

  return (
    <YStack alignItems="center" gap={20} marginVertical={16}>
      <BalanceSummary style={summaryStyle} {...aggregate} />
      {widgets}
      <BalancesTable
        balances={[nztBal,...balances]}
        footerComponent={tableFooterComponent}
        onItemClick={onItemClick}
      />
    </YStack>
  );
}
