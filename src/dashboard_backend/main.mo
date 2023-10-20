import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat16 "mo:base/Nat16";
import Nat64 "mo:base/Nat64";
actor {
    type ICRC_ExternalCanister = actor {
        icrc1_balance_of: shared query ({ owner: Principal; subaccount: ?[Nat8] }) -> async Nat;
        icrc1_name:shared query()->async Text
    };

        public shared func icrc1_token_info(pricipal_id:Text,icrc1_token_canisterId:Text) : async (Nat,Text) {
        
        let token_canister: ICRC_ExternalCanister = actor (icrc1_token_canisterId);
        let wallet_pid = Principal.fromText(pricipal_id);

        let balance : Nat = await token_canister.icrc1_balance_of({owner= wallet_pid;subaccount= null});
        let name:Text=await token_canister.icrc1_name();
        return (balance,name);
    };

type NeuronResult = {
    #Ok: {
        dissolve_delay_seconds: Nat64;
        recent_ballots: [{
            vote: Int32;
            proposal_id: ?{ id: Nat64 };
        }];
        created_timestamp_seconds: Nat64;
        state: Int32;
        stake_e8s: Nat64;
        joined_community_fund_timestamp_seconds: ?Nat64;
        retrieved_at_timestamp_seconds: Nat64;
        known_neuron_data: ?{
            name: Text;
            description: ?Text;
        };
        voting_power: Nat64;
        age_seconds: Nat64;
    };
    #Err: {
        error_message: Text;
        error_type: Int32;
    };
};

type Neuron_ExternalCanister = actor {
    get_neuron_info: shared query (neuron_id: Nat64) -> async NeuronResult;
};

public shared func get_icp_neuron_info(neuron_id: Nat64): async NeuronResult {
    let icp_gov_cid = "rrkah-fqaaa-aaaaa-aaaaq-cai";
    let neuron_canister_icp: Neuron_ExternalCanister = actor(icp_gov_cid);
    return await neuron_canister_icp.get_neuron_info(neuron_id);
};



};
