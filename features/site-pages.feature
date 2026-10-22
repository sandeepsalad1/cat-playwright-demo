Feature: Key cat.com pages and sign-in
  As a visitor
  I want the main information pages and sign-in to work
  So that I can find financing, merchandise and my account

  Scenario Outline: Information pages load
    When I visit the "<page>" page
    Then the page title should mention "<title>"

    Examples:
      | page        | title       |
      | financing   | Financ      |
      | merchandise | Merchandise |

  Scenario: Sign in hands off to Cat ID
    Given I am on the cat.com home page
    When I choose to sign in
    Then I should be on the Cat ID sign-in page
