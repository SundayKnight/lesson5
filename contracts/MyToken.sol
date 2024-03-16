// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "hardhat/console.sol";
/**
 * @title MyToken
 * @dev A simple ERC-20 token contract with minting, burning, and transfer functionalities.
 */
contract MyToken {
    // Token details
    string nameToken;
    string symbolofToken;
    uint8 decimalsOfToken;
    uint256 tokenTotalSupply;
    address public owner;

    // Balances and allowances mapping
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowance;

    /**
     * @dev Constructor to initialize the token with a name and symbol, and mint initial supply to the contract creator.
     * @param _name The name of the token.
     * @param _symbol The symbol of the token.
     */
    constructor(string memory _name, string memory _symbol) {
        nameToken = _name;
        symbolofToken = _symbol;
        decimalsOfToken = 18;
        owner = msg.sender;
        _mint(msg.sender, 10 ether); // 10 * 10^18
    }

    /**
     * @dev Get the name of token.
     * @return The name of token.
     */
    function name() public view returns (string memory) {
        return nameToken;
    }

    /**
     * @dev Get the symbol of token.
     * @return The symbol of token.
     */
    function symbol() public view returns (string memory) {
        return symbolofToken;
    }

    /**
     * @dev Get the decimals of token.
     * @return The decimals of token.
     */
    function decimals() public view returns (uint8) {
        return decimalsOfToken;
    }

    /**
     * @dev Get the total supply of token.
     * @return The total supply of token.
     */
    function totalSupply() public view returns (uint256) {
        return tokenTotalSupply;
    }

    /**
     * @dev Mint new tokens and assign them to a specified recipient.
     * @param recipient The address to receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function mint(address recipient, uint256 amount) public {
        require(msg.sender == owner, "MyToken: you are not an owner");
        _mint(recipient, amount);
    }

    /**
     * @dev Internal function to mint new tokens.
     * @param recipient The address to receive the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function _mint(address recipient, uint256 amount) internal {
        tokenTotalSupply += amount;
        _balances[recipient] += amount;

        emit Transfer(address(0), recipient, amount);
    }

    /**
     * @dev Get the balance of a specified address.
     * @param account The address to query the balance.
     * @return The balance of the specified address.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Transfer tokens to a specified address.
     * @param to The address to transfer tokens to.
     * @param amount The amount of tokens to transfer.
     * @return A boolean indicating whether the transfer was successful or not.
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(_balances[msg.sender] >= amount, "MyToken: Not enough balance");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);

        return true;
    }

    /**
     * @dev Get the allowance granted by the owner to a spender.
     * @param _owner The owner's address.
     * @param spender The spender's address.
     * @return The allowance granted to the spender.
     */
    function allowance(
        address _owner,
        address spender
    ) public view returns (uint256) {
        return _allowance[_owner][spender];
    }

    /**
     * @dev Approve a spender to spend a specified amount on behalf of the owner.
     * @param spender The address of the spender.
     * @param value The amount to be spent.
     * @return A boolean indicating whether the approval was successful or not.
     */
    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0), "MyToken: Approve to the zero address");
        _allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);

        return true;
    }

    /**
     * @dev Transfer tokens from one address to another.
     * @param from The address to transfer tokens from.
     * @param to The address to transfer tokens to.
     * @param amount The amount of tokens to transfer.
     * @return A boolean indicating whether the transfer was successful or not.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        require(_balances[from] >= amount, "MyToken: Insufficient balance");
        require(
            _allowance[from][msg.sender] >= amount,
            "MyToken: Insufficient allowance"
        );

        _balances[from] -= amount;
        _balances[to] += amount;

        _allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);

        return true;
    }

    /**
     * @dev Increase the allowance granted by the owner to a spender.
     * @param spender The address of the spender.
     * @param addedValue The additional amount to increase the allowance by.
     * @return A boolean indicating whether the increase was successful or not.
     */
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public returns (bool) {
        require(spender != address(0), "MyToken: Approve to the zero address");

        _allowance[msg.sender][spender] += addedValue;

        emit Approval(msg.sender, spender, _allowance[msg.sender][spender]);

        return true;
    }

    /**
     * @dev Decrease the allowance granted by the owner to a spender.
     * @param spender The address of the spender.
     * @param subtractedValue The amount to decrease the allowance by.
     * @return A boolean indicating whether the decrease was successful or not.
     */
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public returns (bool) {
        require(
            spender != address(0),
            "MyToken: Decrease allowance for the zero address"
        );

        uint256 currentAllowance = _allowance[msg.sender][spender];
        require(
            currentAllowance >= subtractedValue,
            "MyToken: Allowance cannot be decreased below zero"
        );

        _allowance[msg.sender][spender] -= subtractedValue;

        emit Approval(msg.sender, spender, _allowance[msg.sender][spender]);

        return true;
    }

    /**
     * @dev Burn a specified amount of tokens, reducing the total supply.
     * @param account The address to burn tokens
     * @param amount The amount of tokens to burn.
     */
    function burn(address account, uint256 amount) public {
        require(msg.sender == owner, "MyToken: you are not an owner");
        require(_balances[account] >= amount, "MyToken: Insufficient balance");

        tokenTotalSupply -= amount;
        _balances[account] -= amount;

        emit Transfer(msg.sender, address(0), amount);
    }

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}