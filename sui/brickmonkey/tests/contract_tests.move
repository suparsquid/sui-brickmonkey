// Copyright (c) 2023, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#[test_only]
module brickmonkey::contract_tests {
    use std::vector;
    use std::debug::print as print;
    use sui::coin;
    use sui::coin::{Coin};
    use sui::object::{Self};

    // use std::string::utf8;
    // use std::option;
    // use sui::tx_context;

    use sui::sui::SUI;
    use sui::balance;
    use sui::test_scenario as ts;

    use brickmonkey::contract as bm;


    #[test]
    #[expected_failure(abort_code = bm::EInsufficientBalance)]
    fun test_join_game_insufficient_balance() {
        let player1 = @0xCAFE;
        let owner = @0xFAAA;
        let entry_fee = 200000001;

        let scenario_val = create_game(entry_fee, owner);
        let scenario = &mut scenario_val;

        // bm::EInsufficientBalance
        ts::next_tx(scenario, player1);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let coin = coin::mint_for_testing<SUI>(entry_fee-1, ts::ctx(scenario));
            bm::join_game(&mut game, coin, ts::ctx(scenario));
            ts::return_shared(game);
        };
        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = bm::EAlreadyJoined)]
    fun test_join_game_already_participating() {
        let player1 = @0xCAFE;
        let owner = @0xFAAA;
        let entry_fee = 200000001;

        let scenario_val = create_game(entry_fee, owner);
        let scenario = &mut scenario_val;

        // Join game successfully
        let transaction_effect = ts::next_tx(scenario, player1);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let coin = coin::mint_for_testing<SUI>(entry_fee, ts::ctx(scenario));
            bm::join_game(&mut game, coin, ts::ctx(scenario));
            assert! (bm::in_participants(&game, player1) == true, 1);
            assert! (bm::total_reward(&game) == entry_fee, 3);
            ts::return_shared(game);
        };

        // bm::EAlreadyJoined
        ts::next_tx(scenario, player1);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let coin = coin::mint_for_testing<SUI>(entry_fee, ts::ctx(scenario));
            bm::join_game(&mut game, coin, ts::ctx(scenario));
            ts::return_shared(game);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = bm::ENotOwner)]
    fun test_start_game_not_owner() {
        let player1 = @0xCAFE;
        let owner = @0xFAAA;
        let entry_fee = 200000001;

        let scenario_val = create_game(entry_fee, owner);
        let scenario = &mut scenario_val;

        ts::next_tx(scenario, player1);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            bm::start_game(&mut game, ts::ctx(scenario));
            ts::return_shared(game);
        };

        ts::end(scenario_val);
    }

    #[test]
    #[expected_failure(abort_code = bm::ENoParticipants)]
    fun test_start_game_no_particpants() {
        let owner = @0xFAAA;
        let entry_fee = 200000001;

        let scenario_val = create_game(entry_fee, owner);
        let scenario = &mut scenario_val;

        ts::next_tx(scenario, owner);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            bm::start_game(&mut game, ts::ctx(scenario));
            ts::return_shared(game);
        };

        ts::end(scenario_val);
    }

    #[test]
    fun test_start_game() {
        let player1 = @0xCAFE;
        let owner = @0xFAAA;
        let entry_fee = 200000001;

        let scenario_val = create_game(entry_fee, owner);
        let scenario = &mut scenario_val;

        // Join game successfully
        ts::next_tx(scenario, player1);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let coin = coin::mint_for_testing<SUI>(entry_fee, ts::ctx(scenario));
            bm::join_game(&mut game, coin, ts::ctx(scenario));
            assert! (bm::in_participants(&game, player1) == true, 1);
            assert! (bm::total_reward(&game) == entry_fee, 3);
            ts::return_shared(game);
        };

        ts::next_tx(scenario, owner);
        {
            let game = ts::take_shared<bm::Game>(scenario);   
            bm::start_game(&mut game, ts::ctx(scenario));
            assert! (bm::status(&game) == 1, 1);
            ts::return_shared(game);
        };
        ts::end(scenario_val);
    }

    #[test]
    fun test_end_and_reset_game() {
        let player1 = @0xCAFE;
        let player2 = @0xCAFD;
        let owner = @0xFAAA;
        let entry_fee = 200000001;

        let scenario_val = create_game(entry_fee, owner);
        let scenario = &mut scenario_val;

        // Join game successfully
        ts::next_tx(scenario, player1);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let coin = coin::mint_for_testing<SUI>(entry_fee, ts::ctx(scenario));
            bm::join_game(&mut game, coin, ts::ctx(scenario));
            assert! (bm::in_participants(&game, player1) == true, 1);
            assert! (bm::total_reward(&game) == entry_fee, 3);
            ts::return_shared(game);
        };

        // Join game successfully
        ts::next_tx(scenario, player2);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let coin = coin::mint_for_testing<SUI>(entry_fee, ts::ctx(scenario));
            bm::join_game(&mut game, coin, ts::ctx(scenario));
            assert! (bm::in_participants(&game, player2) == true, 1);
            assert! (bm::total_reward(&game) == entry_fee*2, 3);
            ts::return_shared(game);
        };

        ts::next_tx(scenario, owner);
        {
            let game = ts::take_shared<bm::Game>(scenario);   
            bm::start_game(&mut game, ts::ctx(scenario));
            assert! (bm::status(&game) == 1, 1);
            ts::return_shared(game);
        };

        ts::next_tx(scenario, owner);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            let winners = vector::empty<address>();
            vector::push_back(&mut winners, player1);
            let total_reward = bm::total_reward(&game);
            bm::end_game(&mut game, winners, ts::ctx(scenario));
            assert! (bm::status(&game) == 2, 1);
            let player_cut = ((entry_fee*2)*9)/10;
            
            assert! (bm::total_reward(&game) == (total_reward-player_cut), 3);
            ts::return_shared(game);
        };

        // Assert player got reward
        ts::next_tx(scenario, player1);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(scenario);
            assert! (coin::value(&coin) == (entry_fee*2)*9/10, 3);
            coin::burn_for_testing(coin);
        };

        // Reset game
        let new_entry_fee = 200000002;
        ts::next_tx(scenario, owner);
        let game;
        {
            game = ts::take_shared<bm::Game>(scenario);
            bm::reset_game(&mut game, new_entry_fee, owner, ts::ctx(scenario));
        };
        ts::next_tx(scenario, owner);
        {
            let game2 = ts::take_shared<bm::Game>(scenario);
            assert! (bm::entry_fee(&game2) == new_entry_fee, 1);
            assert! (bm::total_reward(&game2) == 0, 1);
            assert! (bm::status(&game2) == 0, 1);
            ts::return_shared(game);
            ts::return_shared(game2);
        };
        
        ts::end(scenario_val);
    }

    fun create_game(
        entry_fee: u64,
        owner: address,
    ): ts::Scenario {
        let scenario_val = ts::begin(owner);
        let scenario = &mut scenario_val;

        ts::next_tx(scenario, owner);
        {
            bm::create_game(entry_fee, ts::ctx(scenario));
        };

        ts::next_tx(scenario, owner);
        {
            let game = ts::take_shared<bm::Game>(scenario);
            assert! (bm::entry_fee(&game) == entry_fee, 1);
            assert! (bm::total_reward(&game) == 0, 1);
            assert! (bm::status(&game) == 0, 1);
            ts::return_shared(game);
        };

        scenario_val
    }
}
