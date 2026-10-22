Feature: Browse Cat equipment on cat.com
  As a customer researching machines
  I want to move from the home page into the equipment catalogue
  So that I can find the machine family I need

  Background:
    Given I am on the cat.com home page

  Scenario: Open the equipment catalogue from the home page
    When I open the equipment catalogue
    Then I should see more than 10 equipment families
    And the catalogue should include "excavators" and "dozers"

  Scenario Outline: Open an equipment family from the catalogue
    When I open the equipment catalogue
    And I open the "<family>" equipment family
    Then I should be on the "<family>" page titled "<title>"

    Examples:
      | family             | title              |
      | excavators         | Excavators         |
      | dozers             | Dozers             |
      | off-highway-trucks | Off-Highway Trucks |
      | motor-graders      | Motor Graders      |

  Scenario: Drill down from a family to a sub-category
    When I open the equipment catalogue
    And I open the "excavators" equipment family
    And I open the "mini-excavators" sub-category
    Then I should be on the "mini-excavators" sub-category page
